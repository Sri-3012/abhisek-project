import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format, formatDistanceToNow } from 'date-fns';

function NotificationsPanel() {
  const { notifications, markNotificationRead } = useApp();
  const [showAll, setShowAll] = useState(false);

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'price_alert':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'trade_executed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'system':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type, read) => {
    if (read) return 'bg-gray-50 dark:bg-gray-800';
    
    switch (type) {
      case 'price_alert':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'trade_executed':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'system':
        return 'bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  const getNotificationBorderColor = (type, read) => {
    if (read) return 'border-gray-200 dark:border-gray-700';
    
    switch (type) {
      case 'price_alert':
        return 'border-yellow-200 dark:border-yellow-800';
      case 'trade_executed':
        return 'border-green-200 dark:border-green-800';
      case 'system':
        return 'border-blue-200 dark:border-blue-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  const handleMarkAsRead = (id) => {
    markNotificationRead(id);
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowAll(!showAll)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayedNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border transition-colors ${getNotificationBgColor(notification.type, notification.read)} ${getNotificationBorderColor(notification.type, notification.read)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </span>
                  
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
              
              {!notification.read && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No notifications yet</p>
        </div>
      )}

      {notifications.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showAll ? 'Show less' : `Show all ${notifications.length} notifications`}
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;
