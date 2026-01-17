'use client'

interface AmountProps {
  value?: number;
}

function Amount({ value = 1 }: AmountProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-700 dark:text-gray-300 font-medium">余额:</span>
      
      <div className="flex items-center">
        {/* 只显示金额，不可修改 */}
        <div className="px-4 py-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg">
          <span className="font-mono">{value}</span>
        </div>
      </div>

      <span className="text-gray-500 dark:text-gray-400 text-sm">咖啡</span>
    </div>
  )
}

export default Amount
