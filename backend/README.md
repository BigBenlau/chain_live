# Gift Credits Backend

本目录提供 FastAPI + AsyncWeb3 的后端与事件索引器，前端通过 API 生成未签名交易来调用合约。

## 运行环境
- Python 3.10+
- RedHat / Linux

## 安装依赖
```bash
pip install -r backend/requirements.txt
```

## 环境变量
```bash
export RPC_HTTP_URL=http://127.0.0.1:8545
export CHAIN_ID=31337
export GIFT_CONTRACT_ADDRESS=0xYourContract
export GIFT_CONTRACT_ABI=../packages/hardhat/artifacts/contracts/GiftCredits.sol/GiftCredits1155.json
export DATABASE_URL=sqlite+aiosqlite:///./backend/data/events.db
```

## 启动 API
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## 启动索引器
```bash
python -m backend.app.main indexer
```

## 主要接口
- GET `/gifts`
- GET `/gift-count`
- GET `/gift/{gift_id}`
- GET `/treasury`
- GET `/credits/{user}/{gift_id}`
- GET `/earnings/{streamer}/{gift_id}`
- POST `/tx/buy`
- POST `/tx/tip`
- POST `/tx/transfer-credits`
- POST `/tx/redeem-to-token`
- POST `/tx/redeem-to-credit`
- POST `/tx/withdraw-native`
- POST `/tx/add-streamer`
- POST `/tx/remove-streamer`
- POST `/tx/set-gift-config`
- POST `/tx/transfer-treasury`
- POST `/tx/pause`
- POST `/tx/unpause`
