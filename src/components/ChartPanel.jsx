import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

function ChartPanel() {
  const { prices, selectedPair, setSelectedPair, priceHistory } = useApp();
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [timeframe, setTimeframe] = useState('1H');

  const selectedPrice = prices.find(p => p.symbol === selectedPair);

  // Prepare chart data
  const chartData = useMemo(() => {
    return priceHistory.map((point, index) => ({
      time: format(point.time, 'HH:mm:ss'),
      timestamp: point.time,
      price: point.price,
      sma: point.sma,
      ema: point.ema,
      index
    }));
  }, [priceHistory]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(5)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    return value.toFixed(4);
  };

  return (
    <div className="card p-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Price Chart
            </h2>
          </div>
          
          {/* Pair Selector */}
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="input-field w-32"
          >
            {prices.map(price => (
              <option key={price.symbol} value={price.symbol}>
                {price.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="input-field w-20"
          >
            <option value="1H">1H</option>
            <option value="4H">4H</option>
            <option value="1D">1D</option>
            <option value="1W">1W</option>
          </select>

          {/* Chart Settings */}
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={showSMA}
                onChange={(e) => setShowSMA(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-600 dark:text-gray-400">SMA</span>
            </label>
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={showEMA}
                onChange={(e) => setShowEMA(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-600 dark:text-gray-400">EMA</span>
            </label>
          </div>
        </div>
      </div>

      {/* Current Price Info */}
      {selectedPrice && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Current Price</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedPrice.price.toFixed(5)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Change</div>
            <div className={`text-lg font-semibold ${selectedPrice.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {selectedPrice.change > 0 ? '+' : ''}{selectedPrice.change.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">SMA(20)</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedPrice.sma ? selectedPrice.sma.toFixed(5) : '-'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">EMA(20)</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedPrice.ema ? selectedPrice.ema.toFixed(5) : '-'}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#6B7280"
              fontSize={12}
              tickCount={6}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
              tickFormatter={formatYAxis}
              domain={['dataMin - 0.0001', 'dataMax + 0.0001']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Price"
              connectNulls={false}
            />
            
            {/* SMA Line */}
            {showSMA && (
              <Line
                type="monotone"
                dataKey="sma"
                stroke="#10B981"
                strokeWidth={1.5}
                dot={false}
                name="SMA(20)"
                strokeDasharray="5 5"
                connectNulls={false}
              />
            )}
            
            {/* EMA Line */}
            {showEMA && (
              <Line
                type="monotone"
                dataKey="ema"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
                name="EMA(20)"
                strokeDasharray="3 3"
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Price</span>
        </div>
        {showSMA && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-gray-600 dark:text-gray-400">SMA(20)</span>
          </div>
        )}
        {showEMA && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-yellow-500" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-gray-600 dark:text-gray-400">EMA(20)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChartPanel;
