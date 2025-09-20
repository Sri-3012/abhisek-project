import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Filter, Search, SortAsc, SortDesc } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

function TradeBlotter() {
  const { trades } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = trades.filter(trade => {
      const matchesSearch = trade.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           trade.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = filterAction === 'ALL' || trade.action === filterAction;
      return matchesSearch && matchesAction;
    });

    // Sort trades
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'timestamp') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [trades, searchTerm, filterAction, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="w-4 h-4" /> : 
      <SortDesc className="w-4 h-4" />;
  };

  const getActionIcon = (action) => {
    return action === 'BUY' ? 
      <ArrowUp className="w-4 h-4 text-green-600" /> : 
      <ArrowDown className="w-4 h-4 text-red-600" />;
  };

  const getActionColor = (action) => {
    return action === 'BUY' ? 'text-green-600' : 'text-red-600';
  };

  const getPnlColor = (pnl) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatPrice = (price) => {
    return price.toFixed(5);
  };

  const formatQuantity = (quantity) => {
    return quantity.toLocaleString();
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trade Blotter
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredAndSortedTrades.length} trades
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Action Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="input-field flex-1"
          >
            <option value="ALL">All Actions</option>
            <option value="BUY">Buy Only</option>
            <option value="SELL">Sell Only</option>
          </select>
        </div>
      </div>

      {/* Trade Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th 
                className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center space-x-1">
                  <span>Time</span>
                  {getSortIcon('timestamp')}
                </div>
              </th>
              <th 
                className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => handleSort('pair')}
              >
                <div className="flex items-center space-x-1">
                  <span>Pair</span>
                  {getSortIcon('pair')}
                </div>
              </th>
              <th 
                className="text-center py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => handleSort('action')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Action</span>
                  {getSortIcon('action')}
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Quantity</span>
                  {getSortIcon('quantity')}
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Price</span>
                  {getSortIcon('price')}
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => handleSort('pnl')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>P&L</span>
                  {getSortIcon('pnl')}
                </div>
              </th>
              <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTrades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="py-3 px-2">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {format(trade.timestamp, 'HH:mm:ss')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(trade.timestamp, 'MM/dd')}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {trade.pair}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {trade.id}
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {getActionIcon(trade.action)}
                    <span className={`font-medium ${getActionColor(trade.action)}`}>
                      {trade.action}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {formatQuantity(trade.quantity)}
                </td>
                <td className="py-3 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {formatPrice(trade.price)}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className={`font-mono text-sm ${getPnlColor(trade.pnl)}`}>
                    {trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    trade.status === 'FILLED' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {trade.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedTrades.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {trades.length === 0 ? 'No trades yet' : 'No trades match your filters'}
        </div>
      )}
    </div>
  );
}

export default TradeBlotter;
