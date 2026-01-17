'use client'

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

interface AmountProps {
  giftId?: number;
}

function Amount({ giftId = 1 }: AmountProps) {
  const { address } = useAccount();
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || giftId <= 0) {
      setBalance(null);
      return;
    }

    const controller = new AbortController();

    async function fetchCredits() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const url = new URL(`${baseUrl}/credits`);
        url.searchParams.set("user", address);
        url.searchParams.set("gift_id", String(giftId));
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
          throw new Error("fetch credits failed");
        }
        const data = (await response.json()) as { credits: number };
        setBalance(Number(data.credits));
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "unknown error";
        setError(message);
      }
    }

    fetchCredits();
    return () => {
      controller.abort();
    };
  }, [address, giftId]);

  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-700 dark:text-gray-300 font-medium">余额:</span>

      <div className="flex items-center">
        {/* 只显示金额，不可修改 */}
        <div className="px-4 py-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg">
          <span className="font-mono">{balance === null ? "-" : balance}</span>
        </div>
      </div>

      <span className="text-gray-500 dark:text-gray-400 text-sm">咖啡</span>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}

export default Amount
