import argparse
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import JSON as SA_JSON
from sqlalchemy import BigInteger, Column, DateTime, Integer, String, UniqueConstraint, create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from web3 import Web3
from web3.providers.rpc import HTTPProvider

# ===== 配置 =====


class Settings:
    rpc_http_url = os.getenv("RPC_HTTP_URL", "https://testnet-rpc.monad.xyz")

    contract_address = os.getenv("GIFT_CONTRACT_ADDRESS", "0x3a8de1e232d9674626a49e0127dfd8cc3ad9cb68")
    contract_abi_path = os.getenv(
        "GIFT_CONTRACT_ABI",
        "packages/hardhat/deployments/monadTestnet/GiftCredits1155.json",
    )

    database_url = os.getenv("DATABASE_URL", "sqlite:///./backend/data/events.db")
    indexer_start_block = int(os.getenv("INDEXER_START_BLOCK", "0"))
    indexer_poll_interval = float(os.getenv("INDEXER_POLL_INTERVAL", "2.0"))
    indexer_batch_size = int(os.getenv("INDEXER_BATCH_SIZE", "100"))


settings = Settings()

# ===== 数据库 =====

Base = declarative_base()


# 构建同步数据库引擎
def build_engine():
    return create_engine(settings.database_url, pool_pre_ping=True)


engine = build_engine()
SessionLocal = sessionmaker(engine, class_=Session, expire_on_commit=False)


class EventLog(Base):
    __tablename__ = "event_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tx_hash = Column(String, nullable=False)
    log_index = Column(Integer, nullable=False)
    event_name = Column(String, nullable=False)
    block_number = Column(BigInteger, nullable=False)
    args = Column(SA_JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: __import__("datetime").datetime.utcnow(), nullable=False)

    __table_args__ = (UniqueConstraint("tx_hash", "log_index", name="uniq_event_log"),)


class IndexerCheckpoint(Base):
    __tablename__ = "indexer_checkpoints"
    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, unique=True, nullable=False)
    block_number = Column(BigInteger, nullable=False)


# ===== Web3 客户端 =====


# 读取合约 ABI 文件
def load_abi() -> list[dict[str, Any]]:
    path = Path(settings.contract_abi_path).expanduser().resolve()
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data["abi"]


# 创建 HTTP Provider 的 Web3 客户端
def build_web3() -> Web3:
    provider = HTTPProvider(settings.rpc_http_url)
    return Web3(provider)


# 基于配置的合约地址与 ABI 构造合约对象
def get_contract(web3: Web3):
    if not settings.contract_address:
        raise RuntimeError("GIFT_CONTRACT_ADDRESS not set")
    abi = load_abi()
    return web3.eth.contract(address=web3.to_checksum_address(settings.contract_address), abi=abi)


# ===== 数据结构 =====


class TxPayload(BaseModel):
    to: str
    data: str
    value: int


class BuyRequest(BaseModel):
    giftId: int = Field(..., ge=1)
    amount: int = Field(..., gt=0)


class TipRequest(BaseModel):
    streamer: str
    giftId: int = Field(..., ge=1)
    amount: int = Field(..., gt=0)
    clientNonce: int = Field(..., ge=0)


class TransferCreditsRequest(BaseModel):
    to: str
    giftId: int = Field(..., ge=1)
    amount: int = Field(..., gt=0)


class RedeemToTokenRequest(BaseModel):
    giftId: int = Field(..., ge=1)
    amount: int = Field(..., gt=0)
    to: str


class RedeemToCreditRequest(BaseModel):
    giftId: int = Field(..., ge=1)
    amount: int = Field(..., gt=0)


class WithdrawNativeRequest(BaseModel):
    streamer: str
    giftId: int = Field(..., ge=1)
    amount: int = Field(..., gt=0)
    to: str


class AddStreamerRequest(BaseModel):
    streamer: str


class RemoveStreamerRequest(BaseModel):
    streamer: str


class SetGiftConfigRequest(BaseModel):
    giftId: int = Field(..., ge=1)
    priceNative: int = Field(..., ge=0)
    enabled: bool


class TransferTreasuryRequest(BaseModel):
    to: str
    amount: int = Field(..., gt=0)


class EmptyRequest(BaseModel):
    pass


# ===== FastAPI 接口 =====

# 启动时初始化数据库表
@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Gift Credits Backend", version="0.1.0", lifespan=lifespan)


# 构造未签名交易 payload（to/data/value）
def _build_payload(contract_address: str, function, value: int = 0) -> TxPayload:
    data = function._encode_transaction_data()
    return TxPayload(to=contract_address, data=data, value=value)


@app.get("/health")
# 健康检查接口
def health() -> dict:
    return {"status": "ok"}


@app.get("/gifts")
# 获取所有礼物配置
def list_gifts() -> dict:
    web3 = build_web3()
    contract = get_contract(web3)
    gift_count = contract.functions.giftCount().call()
    gifts = []
    for gift_id in range(1, gift_count + 1):
        config = contract.functions.giftConfig(gift_id).call()
        gifts.append(
            {
                "giftId": gift_id,
                "priceNative": int(config[0]),
                "enabled": bool(config[1]),
            }
        )
    return {"giftCount": gift_count, "gifts": gifts}


@app.get("/gift-count")
# 获取礼物数量
def get_gift_count() -> dict:
    web3 = build_web3()
    contract = get_contract(web3)
    gift_count = contract.functions.giftCount().call()
    return {"giftCount": gift_count}


@app.get("/gift/{gift_id}")
# 获取单个礼物配置
def get_gift_config(gift_id: int) -> dict:
    web3 = build_web3()
    contract = get_contract(web3)
    config = contract.functions.giftConfig(gift_id).call()
    return {"giftId": gift_id, "priceNative": int(config[0]), "enabled": bool(config[1])}


@app.get("/treasury")
# 查询合约资金归集地址
def get_treasury() -> dict:
    web3 = build_web3()
    contract = get_contract(web3)
    treasury = contract.functions.treasury().call()
    return {"treasury": treasury}


@app.get("/credits/{user}/{gift_id}")
# 查询用户 credits 余额
def credits_of(user: str, gift_id: int) -> dict:
    web3 = build_web3()
    contract = get_contract(web3)
    amount = contract.functions.creditsOf(user, gift_id).call()
    return {"user": user, "giftId": gift_id, "credits": int(amount)}


@app.get("/earnings/{streamer}/{gift_id}")
# 查询主播 earnings 余额
def earnings_of(streamer: str, gift_id: int) -> dict:
    web3 = build_web3()
    contract = get_contract(web3)
    amount = contract.functions.earningsOf(streamer, gift_id).call()
    return {"streamer": streamer, "giftId": gift_id, "earnings": int(amount)}


@app.post("/tx/buy", response_model=TxPayload)
# 生成 buyWithNative 的未签名交易
def tx_buy(request: BuyRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    config = contract.functions.giftConfig(request.giftId).call()
    price_native = int(config[0])
    value = price_native * request.amount
    fn = contract.functions.buyWithNative(request.giftId, request.amount)
    return _build_payload(contract.address, fn, value=value)


@app.post("/tx/tip", response_model=TxPayload)
# 生成 tip 的未签名交易
def tx_tip(request: TipRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.tip(
        request.streamer, request.giftId, request.amount, request.clientNonce
    )
    return _build_payload(contract.address, fn)


@app.post("/tx/transfer-credits", response_model=TxPayload)
# 生成 transferCredits 的未签名交易
def tx_transfer_credits(request: TransferCreditsRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.transferCredits(request.to, request.giftId, request.amount)
    return _build_payload(contract.address, fn)


@app.post("/tx/redeem-to-token", response_model=TxPayload)
# 生成 redeemToToken 的未签名交易
def tx_redeem_to_token(request: RedeemToTokenRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.redeemToToken(request.giftId, request.amount, request.to)
    return _build_payload(contract.address, fn)


@app.post("/tx/redeem-to-credit", response_model=TxPayload)
# 生成 redeemToCredit 的未签名交易
def tx_redeem_to_credit(request: RedeemToCreditRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.redeemToCredit(request.giftId, request.amount)
    return _build_payload(contract.address, fn)


@app.post("/tx/withdraw-native", response_model=TxPayload)
# 生成 withdrawNative 的未签名交易
def tx_withdraw_native(request: WithdrawNativeRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    config = contract.functions.giftConfig(request.giftId).call()
    price_native = int(config[0])
    value = price_native * request.amount
    fn = contract.functions.withdrawNative(
        request.streamer, request.giftId, request.amount, request.to
    )
    return _build_payload(contract.address, fn, value=value)


@app.post("/tx/add-streamer", response_model=TxPayload)
# 生成 addStreamer 的未签名交易
def tx_add_streamer(request: AddStreamerRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.addStreamer(request.streamer)
    return _build_payload(contract.address, fn)


@app.post("/tx/remove-streamer", response_model=TxPayload)
# 生成 removeStreamer 的未签名交易
def tx_remove_streamer(request: RemoveStreamerRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.removeStreamer(request.streamer)
    return _build_payload(contract.address, fn)


@app.post("/tx/set-gift-config", response_model=TxPayload)
# 生成 setGiftConfig 的未签名交易
def tx_set_gift_config(request: SetGiftConfigRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.setGiftConfig(request.giftId, request.priceNative, request.enabled)
    return _build_payload(contract.address, fn)


@app.post("/tx/transfer-treasury", response_model=TxPayload)
# 生成 transferTreasury 的未签名交易
def tx_transfer_treasury(request: TransferTreasuryRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.transferTreasury(request.to, request.amount)
    return _build_payload(contract.address, fn)


@app.post("/tx/pause", response_model=TxPayload)
# 生成 pause 的未签名交易
def tx_pause(_: EmptyRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.pause()
    return _build_payload(contract.address, fn)


@app.post("/tx/unpause", response_model=TxPayload)
# 生成 unpause 的未签名交易
def tx_unpause(_: EmptyRequest) -> TxPayload:
    web3 = build_web3()
    contract = get_contract(web3)
    fn = contract.functions.unpause()
    return _build_payload(contract.address, fn)


@app.exception_handler(RuntimeError)
# 统一处理运行时错误
async def runtime_error_handler(_, exc: RuntimeError) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# ===== 事件索引器 =====

EVENT_NAMES = [
    "GiftPurchased",
    "Tipped",
    "Withdrawn",
    "RedeemedToToken",
    "RedeemedToCredit",
    "GiftConfigUpdated",
    "TreasuryTransferred",
    "CreditsTransferred",
]


# 初始化索引器所需的数据表
def _ensure_tables() -> None:
    Base.metadata.create_all(bind=engine)


# 读取索引器检查点
def _get_checkpoint(session: Session) -> int:
    result = session.execute(select(IndexerCheckpoint).where(IndexerCheckpoint.source == "gift_credits"))
    row = result.scalar_one_or_none()
    if row:
        return int(row.block_number)
    return settings.indexer_start_block


# 更新索引器检查点
def _set_checkpoint(session: Session, block_number: int) -> None:
    result = session.execute(select(IndexerCheckpoint).where(IndexerCheckpoint.source == "gift_credits"))
    row = result.scalar_one_or_none()
    if row:
        row.block_number = block_number
        session.add(row)
    else:
        session.add(IndexerCheckpoint(source="gift_credits", block_number=block_number))


# 解码链上事件日志
def _decode_event(contract, log: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    for name in EVENT_NAMES:
        event_cls = getattr(contract.events, name)
        try:
            decoded = event_cls().process_log(log)
            return name, dict(decoded["args"])
        except Exception:
            continue
    raise ValueError("unknown event")


# 同步轮询链上事件并写入数据库
def run_indexer() -> None:
    _ensure_tables()
    web3 = build_web3()
    contract = get_contract(web3)

    while True:
        session = SessionLocal()
        try:
            start_block = _get_checkpoint(session)
            latest_block = web3.eth.block_number
            if latest_block <= start_block:
                time.sleep(settings.indexer_poll_interval)
                continue

            from_block = start_block + 1
            to_block = latest_block
            logs = web3.eth.get_logs(
                {"fromBlock": from_block, "toBlock": to_block, "address": contract.address}
            )

            for log in logs:
                event_name, args = _decode_event(contract, log)
                record = EventLog(
                    tx_hash=log["transactionHash"].hex(),
                    log_index=int(log["logIndex"]),
                    event_name=event_name,
                    block_number=int(log["blockNumber"]),
                    args=args,
                )
                session.add(record)
                try:
                    session.flush()
                except IntegrityError:
                    session.rollback()
                    continue

            _set_checkpoint(session, to_block)
            session.commit()
        finally:
            session.close()

        time.sleep(settings.indexer_poll_interval)


# CLI 入口：启动索引器或提示启动 API
def main() -> None:
    parser = argparse.ArgumentParser(description="Gift Credits Backend")
    parser.add_argument("command", nargs="?", help="indexer")
    args = parser.parse_args()
    if args.command == "indexer":
        run_indexer()
    else:
        print("Use `uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`")
        print("Or run indexer: `python -m backend.app.main indexer`")


if __name__ == "__main__":
    main()
