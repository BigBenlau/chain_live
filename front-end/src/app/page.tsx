'use client'

import { useState } from 'react'
import { useConnection } from 'wagmi'
import ConnectButton from './components/connect-button'
import Connect from './components/connect'
import Video from './components/video'
import Gift from './components/gift'
import Rank from './components/rank'
import Amount from './components/amount'

function App() {
  const [showConnect, setShowConnect] = useState(false)
  const connection = useConnection()

  const handleConnectClick = () => {
    setShowConnect(!showConnect)
  }

  return (
    <div>
      {/* Header div with button */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex justify-end items-center space-x-4">
            <ConnectButton handleConnectClick={handleConnectClick} />
            <Amount />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {showConnect && (
          <Connect onClose={() => setShowConnect(false)} />
        )}
        {!showConnect && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左侧：视频和礼物 */}
              <div className="lg:col-span-2 space-y-8">
                <Video/>
                <Gift/>
              </div>
              
              {/* 右侧：排行榜 */}
              <div className="lg:col-span-1">
                <Rank/>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
