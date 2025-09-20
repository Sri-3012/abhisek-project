import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { dataStream, mockAPI } from '../services/mockDataService';

// Initial state
const initialState = {
  prices: [],
  selectedPair: 'EUR/USD',
  priceHistory: [],
  trades: [],
  notifications: [],
  showNotificationsPopup: false,
  darkMode: false,
  loading: false,
  error: null
};

// Action types
const ActionTypes = {
  SET_PRICES: 'SET_PRICES',
  SET_SELECTED_PAIR: 'SET_SELECTED_PAIR',
  SET_PRICE_HISTORY: 'SET_PRICE_HISTORY',
  ADD_TRADE: 'ADD_TRADE',
  SET_TRADES: 'SET_TRADES',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  TOGGLE_NOTIFICATIONS_POPUP: 'TOGGLE_NOTIFICATIONS_POPUP',
  TOGGLE_DARK_MODE: 'TOGGLE_DARK_MODE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_PRICES:
      return { ...state, prices: action.payload };
    
    case ActionTypes.SET_SELECTED_PAIR:
      return { ...state, selectedPair: action.payload };
    
    case ActionTypes.SET_PRICE_HISTORY:
      return { ...state, priceHistory: action.payload };
    
    case ActionTypes.ADD_TRADE:
      return { 
        ...state, 
        trades: [action.payload, ...state.trades].slice(0, 100) // Keep last 100 trades
      };
    
    case ActionTypes.SET_TRADES:
      return { ...state, trades: action.payload };
    
    case ActionTypes.ADD_NOTIFICATION:
      return { 
        ...state, 
        notifications: [action.payload, ...state.notifications].slice(0, 50) // Keep last 50 notifications
      };
    
    case ActionTypes.SET_NOTIFICATIONS:
      return { ...state, notifications: action.payload };
    
    case ActionTypes.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };
    
    case ActionTypes.TOGGLE_NOTIFICATIONS_POPUP:
      return { ...state, showNotificationsPopup: !state.showNotificationsPopup };
    
    case ActionTypes.TOGGLE_DARK_MODE:
      return { ...state, darkMode: !state.darkMode };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
        
        // Load initial prices
        const prices = mockAPI.getPrices();
        dispatch({ type: ActionTypes.SET_PRICES, payload: prices });
        
        // Load trade history
        const trades = mockAPI.getTradeHistory();
        dispatch({ type: ActionTypes.SET_TRADES, payload: trades });
        
        // Load notifications
        const notifications = mockAPI.getNotifications();
        dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: notifications });
        
        // Load price history for selected pair
        const priceHistory = mockAPI.getPriceHistory(state.selectedPair);
        dispatch({ type: ActionTypes.SET_PRICE_HISTORY, payload: priceHistory });
        
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    };

    loadInitialData();
  }, []);

  // Subscribe to real-time price updates
  useEffect(() => {
    const unsubscribe = dataStream.subscribe('getPrices', (prices) => {
      dispatch({ type: ActionTypes.SET_PRICES, payload: prices });
    });

    return unsubscribe;
  }, []);

  // Update price history when selected pair changes
  useEffect(() => {
    const priceHistory = mockAPI.getPriceHistory(state.selectedPair);
    dispatch({ type: ActionTypes.SET_PRICE_HISTORY, payload: priceHistory });
  }, [state.selectedPair]);

  // Actions
  const actions = {
    setSelectedPair: (pair) => {
      dispatch({ type: ActionTypes.SET_SELECTED_PAIR, payload: pair });
    },

    executeTrade: async (pair, action, quantity) => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
        const trade = await mockAPI.executeTrade(pair, action, quantity);
        dispatch({ type: ActionTypes.ADD_TRADE, payload: trade });
        
        // Add notification
        const notification = {
          id: Date.now(),
          type: 'trade_executed',
          message: `Trade executed: ${action} ${quantity.toLocaleString()} ${pair} at ${trade.price}`,
          timestamp: new Date(),
          read: false
        };
        dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notification });
        
        return trade;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    },

    markNotificationRead: (id) => {
      dispatch({ type: ActionTypes.MARK_NOTIFICATION_READ, payload: id });
    },

    toggleNotificationsPopup: () => {
      dispatch({ type: ActionTypes.TOGGLE_NOTIFICATIONS_POPUP });
    },

    toggleDarkMode: () => {
      dispatch({ type: ActionTypes.TOGGLE_DARK_MODE });
    },

    clearError: () => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    }
  };

  // Apply dark mode to document
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const value = {
    ...state,
    ...actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
