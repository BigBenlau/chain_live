'use client'

import { useConnection } from 'wagmi'

function ConnectButton(props: { handleConnectClick: () => void }) {
  const connection = useConnection()

  // 根据连接状态确定按钮标题
  const getButtonText = () => {
    if (connection.status === 'connected' && connection.addresses && connection.addresses.length > 0) {
      // 显示第一个地址，进行截断处理
      const addr = connection.addresses[0]
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
    }
    return '连接钱包'
  }

  return (
    <div>
      <button
        onClick={props.handleConnectClick}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {getButtonText()}
      </button>
    </div>
  )
}

export default ConnectButton
