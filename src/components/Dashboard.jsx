import React from 'react';
import Header from './Header';
import PricePanel from './PricePanel';
import ChartPanel from './ChartPanel';
import TradeBlotter from './TradeBlotter';
import NotificationsPopup from './NotificationsPopup';
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
          
          {/* Right Column - Trade Execution and Trade Blotter */}
          <div className="lg:col-span-4 space-y-6">
            {/* Trade Execution */}
            <TradeExecution />
            
            {/* Trade Blotter */}
            <TradeBlotter />
          </div>
        </div>
      </div>
      
      {/* Notifications Popup */}
      <NotificationsPopup />
    </div>
  );
}

export default Dashboard;
