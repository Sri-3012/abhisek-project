import React, { useState } from 'react';
import { ArrowUp, ArrowDown, DollarSign, Calculator, X, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';

function TradeExecution() {
  const { prices, selectedPair, executeTrade, loading } = useApp();
  const [quantity, setQuantity] = useState(10000);
  const [action, setAction] = useState('BUY');

  const selectedPrice = prices.find(p => p.symbol === selectedPair);

  const handleExecuteTrade = async () => {
    if (!selectedPrice || quantity <= 0) return;

    try {
      await executeTrade(selectedPair, action, quantity);
      // Reset form after successful trade
      setQuantity(10000);
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  };

  const calculateNotional = () => {
    if (!selectedPrice) return 0;
    return quantity * selectedPrice.price;
  };

  const getActionColor = (action) => {
    return action === 'BUY' ? 'text-green-600' : 'text-red-600';
  };

  const getActionBgColor = (action) => {
    return action === 'BUY' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
  };

  // Generate trading recommendation based on SMA and EMA
  const generateRecommendation = () => {
    if (!selectedPrice || !selectedPrice.sma || !selectedPrice.ema) {
      return {
        signal: 'NEUTRAL',
        confidence: 0,
        reason: 'Insufficient data for analysis',
        strength: 'WEAK'
      };
    }

    const { price, sma, ema } = selectedPrice;
    let signal = 'NEUTRAL';
    let confidence = 0;
    let reason = '';
    let strength = 'WEAK';

    // EMA above/below SMA analysis
    const emaAboveSma = ema > sma;
    const priceAboveEma = price > ema;
    const priceAboveSma = price > sma;

    // Calculate distances for confidence
    const emaSmaDistance = Math.abs(ema - sma) / sma * 100;
    const priceEmaDistance = Math.abs(price - ema) / ema * 100;

    if (emaAboveSma && priceAboveEma && priceAboveSma) {
      signal = 'BUY';
      confidence = Math.min(90, 50 + emaSmaDistance * 10 + priceEmaDistance * 5);
      reason = 'Bullish trend: Price above both EMA and SMA, EMA above SMA';
      strength = confidence > 70 ? 'STRONG' : confidence > 50 ? 'MODERATE' : 'WEAK';
    } else if (!emaAboveSma && !priceAboveEma && !priceAboveSma) {
      signal = 'SELL';
      confidence = Math.min(90, 50 + emaSmaDistance * 10 + priceEmaDistance * 5);
      reason = 'Bearish trend: Price below both EMA and SMA, EMA below SMA';
      strength = confidence > 70 ? 'STRONG' : confidence > 50 ? 'MODERATE' : 'WEAK';
    } else if (emaAboveSma && priceAboveEma) {
      signal = 'BUY';
      confidence = Math.min(75, 40 + emaSmaDistance * 8);
      reason = 'Moderate bullish: Price above EMA, EMA above SMA';
      strength = confidence > 60 ? 'MODERATE' : 'WEAK';
    } else if (!emaAboveSma && !priceAboveEma) {
      signal = 'SELL';
      confidence = Math.min(75, 40 + emaSmaDistance * 8);
      reason = 'Moderate bearish: Price below EMA, EMA below SMA';
      strength = confidence > 60 ? 'MODERATE' : 'WEAK';
    } else {
      signal = 'NEUTRAL';
      confidence = 25;
      reason = 'Mixed signals: Consider waiting for clearer trend';
      strength = 'WEAK';
    }

    return { signal, confidence: Math.round(confidence), reason, strength };
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Execute Trade
        </h2>
      </div>

      {/* Selected Pair Info */}
      {selectedPrice && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Selected Pair</span>
            <span className="font-semibold text-gray-900 dark:text-white">{selectedPair}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Current Price</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {selectedPrice.price.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {/* AI Recommendation Panel */}
      {selectedPrice && (() => {
        const recommendation = generateRecommendation();
        const signalColor = recommendation.signal === 'BUY' ? 'green' : 
                           recommendation.signal === 'SELL' ? 'red' : 'gray';
        const signalIcon = recommendation.signal === 'BUY' ? TrendingUp : 
                          recommendation.signal === 'SELL' ? TrendingDown : Target;
        const SignalIcon = signalIcon;

        return (
          <div className={`p-4 rounded-lg mb-4 border-2 ${
            recommendation.signal === 'BUY' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            recommendation.signal === 'SELL' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
            'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <SignalIcon className={`w-5 h-5 text-${signalColor}-600`} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Recommendations
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium text-${signalColor}-800 bg-${signalColor}-100 dark:bg-${signalColor}-900/30`}>
                  {recommendation.signal}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  recommendation.strength === 'STRONG' ? 'text-blue-800 bg-blue-100 dark:bg-blue-900/30' :
                  recommendation.strength === 'MODERATE' ? 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/30' :
                  'text-gray-800 bg-gray-100 dark:bg-gray-900/30'
                }`}>
                  {recommendation.strength}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-${signalColor}-500`}
                      style={{ width: `${recommendation.confidence}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {recommendation.confidence}%
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {recommendation.reason}
              </p>
              
              {selectedPrice.sma && selectedPrice.ema && (
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">SMA (20)</span>
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                      {selectedPrice.sma.toFixed(5)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">EMA (20)</span>
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                      {selectedPrice.ema.toFixed(5)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Action Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Action
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAction('BUY')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              action === 'BUY'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ArrowUp className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-600">BUY</span>
            </div>
          </button>
          <button
            onClick={() => setAction('SELL')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              action === 'SELL'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ArrowDown className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-600">SELL</span>
            </div>
          </button>
        </div>
      </div>

      {/* Technical Analysis Details */}
      {selectedPrice && selectedPrice.sma && selectedPrice.ema && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Technical Analysis
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Price vs EMA:</span>
              <span className={`font-medium ${
                selectedPrice.price > selectedPrice.ema ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedPrice.price > selectedPrice.ema ? 'Above' : 'Below'} EMA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Price vs SMA:</span>
              <span className={`font-medium ${
                selectedPrice.price > selectedPrice.sma ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedPrice.price > selectedPrice.sma ? 'Above' : 'Below'} SMA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">EMA vs SMA:</span>
              <span className={`font-medium ${
                selectedPrice.ema > selectedPrice.sma ? 'text-green-600' : 'text-red-600'
              }`}>
                EMA {selectedPrice.ema > selectedPrice.sma ? 'Above' : 'Below'} SMA
                {selectedPrice.ema > selectedPrice.sma ? ' (Bullish)' : ' (Bearish)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quantity
        </label>
        <div className="relative">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="input-field pr-12"
            placeholder="Enter quantity"
            min="1"
            step="1000"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
            units
          </div>
        </div>
        <div className="flex space-x-2 mt-2">
          {[10000, 50000, 100000].map((amount) => (
            <button
              key={amount}
              onClick={() => setQuantity(amount)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              {amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Notional Value</span>
          <span className="font-mono text-gray-900 dark:text-white">
            ${calculateNotional().toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Spread</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {selectedPrice ? (selectedPrice.ask - selectedPrice.bid).toFixed(5) : '0.00000'}
          </span>
        </div>
      </div>

      {/* Execute Button */}
      <button
        onClick={handleExecuteTrade}
        disabled={loading || !selectedPrice || quantity <= 0}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          action === 'BUY'
            ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400'
            : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Executing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            {action === 'BUY' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            <span>{action} {quantity.toLocaleString()} {selectedPair}</span>
          </div>
        )}
      </button>

      {/* Risk Warning */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ This is a demo environment. No real money is at risk.
        </p>
      </div>
    </div>
  );
}

export default TradeExecution;
