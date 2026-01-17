'use client'

import { useTx } from "./use-tx";

function Gift() {
  const { hash, error, isSubmitting, sendTx } = useTx();

  const datas = [
    {
      id: 1,
      url: "/gift1.png",
      price: "0.0001",
    },
    {
      id: 2,
      url: "/gift2.png",
      price: "0.001",
    },
    {
      id: 3,
      url: "/gift3.png",
      price: "0.005",
    }
  ];

  async function OnItemClick(id: number) {
    await sendTx("/tx/buy", { giftId: id, amount: 1 });

    const streamer = "0x451DcAcfd7e92A3604Ed68E063BFa1200c3D3aF3";
    if (!streamer) {
      return;
    }

    await sendTx("/tx/tip", {
      streamer,
      giftId: id,
      amount: 1,
      clientNonce: Date.now(),
    });
  }

  return (
    <div className="mt-6 flex flex-col items-center justify-center">
      <div className="flex justify-center gap-4">
        {
          datas.map(data => <GiftItem key={data.id} url={data.url} OnItemClick={OnItemClick} id={data.id} price={data.price} />)
        }
      </div>
      {hash && <div>Transaction Hash: {hash}</div>}
      {isSubmitting && <div className="text-white mt-2">提交交易中...</div>}
      {error && <div className="text-red-400 mt-2">{error}</div>}
    </div>
  )
}

function GiftItem(props: { id: number, url: string, OnItemClick: (id: number) => void, price: string }) {
  return (
    <div className="text-center flex-shrink-0">
      <div>
        <img
          src={props.url}
          alt="礼物 url"
          className="w-40 h-40 object-contain rounded-lg shadow-lg"
          onClick={() => props.OnItemClick(props.id)}
        />
        <p className="text-white text-sm mt-2">MON:{props.price}</p>
      </div>
    </div>
  )
}

export default Gift
