import { useState } from "react";

import { useWatchContractEvent } from 'wagmi'

interface VideoItemProps {
  src: string;
  alt: string;
  count: number;
}

function VideoItem({ src, alt, count }: VideoItemProps) {
  return (
    <div className="text-center">
      <div className="relative">
        {/* 数字显示在图片上方 */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">{count}</span>
          </div>
        </div>
        <img
          src={src}
          alt={alt}
          className="w-80 h-80 object-cover shadow-xl relative z-0"
        />
      </div>
    </div>
  )
}

function Video() {
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);

  const abi = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "giftId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "payAmount",
          "type": "uint256"
        }
      ],
      "name": "GiftPurchased",
      "type": "event"
    }
  ]

  useWatchContractEvent({
    address: '0x3a8de1E232d9674626A49e0127DFD8cc3aD9cb68', // 合约地址
    abi, // 合约 ABI
    eventName: 'GiftPurchased', // 事件名称
    onLogs(logs) {
      console.log('New logs!', logs)
      // 处理事件日志
    },
  })

  return (
    <div className="flex flex-row justify-center items-center gap-0">
      <VideoItem src="/girl1.png" alt="女孩图片 1" count={count1} />
      <VideoItem src="/girl2.png" alt="女孩图片 2" count={count2} />
    </div>
  )
}

export default Video
