'use client'

interface RankItem {
  id: number;
  address: string;
  amount: number;
  rank: number;
}

function Rank() {
  // 示例数据
  const rankData: RankItem[] = [
    { id: 1, address: '0x742d35Cc6634C0532925a3b844Bc9e...', amount: 1250, rank: 1 },
    { id: 2, address: '0x5A0b54D5dc17e0AadC383d2db43B0a...', amount: 980, rank: 2 },
    { id: 3, address: '0x3f5CE5FBFe3E9af3971dD833D26bA9...', amount: 750, rank: 3 },
    { id: 4, address: '0x28c6c06298d514Db089934071355E...', amount: 620, rank: 4 },
    { id: 5, address: '0x21a31Ee1afC51d94C2eFcCAa2092a...', amount: 510, rank: 5 },
    { id: 6, address: '0xDFd5293D8e347dFe59E90eFd55b...', amount: 430, rank: 6 },
    { id: 7, address: '0x56Eddb7aa87536c09CCc279347...', amount: 380, rank: 7 },
    { id: 8, address: '0x9696f59E4d72E237BE84fFD42...', amount: 320, rank: 8 },
    { id: 9, address: '0x4B1C2cD1F5c71F...', amount: 290, rank: 9 },
    { id: 10, address: '0x3Cd6A1aF...', amount: 250, rank: 10 },
  ];

  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
  };

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          咖啡排行榜
        </h2>
      </div>

      <div className="space-y-4">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-1 text-center">排名</div>
          <div className="col-span-7">地址</div>
          <div className="col-span-4 text-right">杯</div>
        </div>

        {/* 排行榜列表 */}
        {rankData.map((item) => (
          <div 
            key={item.id} 
            className="grid grid-cols-12 gap-4 items-center py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {/* 排名 */}
            <div className="col-span-1 flex justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                item.rank === 1 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                  : item.rank === 2 
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  : item.rank === 3
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                  : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                <span className="font-bold">{item.rank}</span>
              </div>
            </div>

            {/* 地址 */}
            <div className="col-span-7">
              <div className="font-mono text-sm text-gray-900 dark:text-white">
                {formatAddress(item.address)}
              </div>
            </div>

            {/* 金额 */}
            <div className="col-span-4 text-right">
              <div className="font-bold text-gray-900 dark:text-white">
                {formatAmount(item.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>共 {rankData.length} 位用户</div>
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
            查看更多 →
          </button>
        </div>
      </div>
    </div>
  );
}

export default Rank;
