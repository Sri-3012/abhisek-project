import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

function PricePanel() {
  const { prices } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrices = prices.filter(price =>
    price.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price, decimals = 5) => {
    return price.toFixed(decimals);
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Live Prices
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Updated: {format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search currency pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Price Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Pair
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Bid
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Ask
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Change
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                SMA(20)
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                EMA(20)
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPrices.map((price) => (
              <tr
                key={price.symbol}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="py-3 px-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {price.symbol}
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {formatPrice(price.bid)}
                </td>
                <td className="py-3 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {formatPrice(price.ask)}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className={`flex items-center justify-end space-x-1 ${getChangeColor(price.change)}`}>
                    {getChangeIcon(price.change)}
                    <span className="font-mono text-sm">
                      {price.change > 0 ? '+' : ''}{price.change.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                  {price.sma ? formatPrice(price.sma) : '-'}
                </td>
                <td className="py-3 px-2 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                  {price.ema ? formatPrice(price.ema) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPrices.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No currency pairs found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}

export default PricePanel;
