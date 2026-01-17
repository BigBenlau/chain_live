'use client'

import { useState } from "react";
import { useSendTransaction } from 'wagmi'

function Gift() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { data: hash, sendTransaction } = useSendTransaction()

  async function postTx(path: string, body: unknown) {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "backend error");
    }
    return response.json() as Promise<{ to: string; data: string; value: number }>;
  }

  async function OnItemClick(id: number) {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = await postTx("/tx/buy", { giftId: id, amount: 1 });
      sendTransaction({
        to: payload.to as `0x${string}`,
        data: payload.data as `0x${string}`,
        value: BigInt(payload.value),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
