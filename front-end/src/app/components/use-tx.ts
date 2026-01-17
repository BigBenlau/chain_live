"use client";

import { useState } from "react";
import { useSendTransaction } from "wagmi";

type TxPayload = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

// 统一封装发送交易流程与后端 payload 获取
export function useTx() {
  const { data: hash, sendTransaction } = useSendTransaction();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const payload = (await response.json()) as { to: string; data: string; value: number };
    return {
      to: payload.to as `0x${string}`,
      data: payload.data as `0x${string}`,
      value: BigInt(payload.value),
    } satisfies TxPayload;
  }

  async function sendTx(path: string, body: unknown) {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = await postTx(path, body);
      sendTransaction(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { hash, error, isSubmitting, sendTx };
}
