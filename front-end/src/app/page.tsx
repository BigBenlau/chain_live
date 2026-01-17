'use client'

import { useState } from 'react'
import { useConnection } from 'wagmi'
import ConnectButton from './components/connect-button'
import Connect from './components/connect'
import Video from './components/video'
import Gift from './components/gift'

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
          <div className="flex justify-end items-center">
            <ConnectButton handleConnectClick={handleConnectClick} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {showConnect ? (
          <Connect />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Video/>
            <Gift/>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
