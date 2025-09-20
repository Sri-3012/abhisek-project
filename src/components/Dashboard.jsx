import React from 'react';
import Header from './Header';
import PricePanel from './PricePanel';
import ChartPanel from './ChartPanel';
import TradeBlotter from './TradeBlotter';
import NotificationsPanel from './NotificationsPanel';
import TradeExecution from './TradeExecution';

function Dashboard() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Price Panel and Chart */}
          <div className="lg:col-span-8 space-y-6">
            {/* Price Panel */}
            <PricePanel />
            
            {/* Chart Panel */}
            <ChartPanel />
          </div>
          
          {/* Right Column - Trade Execution, Blotter, and Notifications */}
          <div className="lg:col-span-4 space-y-6">
            {/* Trade Execution */}
            <TradeExecution />
            
            {/* Trade Blotter */}
            <TradeBlotter />
            
            {/* Notifications */}
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
