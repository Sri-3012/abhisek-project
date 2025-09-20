# AlphaFxTrader - Forex Trading Frontend

A modern, responsive forex trading dashboard built with React, featuring real-time price streaming, interactive charts, trade execution, and comprehensive trade management.

## Features

### 🚀 Core Features
- **Real-time Price Streaming**: Live forex prices with 1-second updates
- **Interactive Charts**: Price charts with SMA/EMA moving averages using Recharts
- **Trade Execution**: Buy/sell orders with quantity selection
- **Trade Blotter**: Comprehensive trade history with filtering and sorting
- **Notifications**: Real-time alerts and system notifications
- **Dark Mode**: Toggle between light and dark themes

### 📊 Trading Features
- **Currency Pairs**: Support for major forex pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD)
- **Moving Averages**: Simple Moving Average (SMA) and Exponential Moving Average (EMA)
- **Price Alerts**: Visual indicators for price movements
- **Trade History**: Complete trade log with P&L tracking
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 🎨 UI/UX Features
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Interactive Elements**: Hover effects, smooth transitions, and intuitive controls
- **Color-coded Actions**: Green for buy orders, red for sell orders
- **Real-time Updates**: Live data updates without page refresh
- **Search & Filter**: Find specific trades and currency pairs quickly

## Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with custom components
- **Charts**: Recharts for interactive price charts
- **Icons**: Lucide React for consistent iconography
- **State Management**: React Context with useReducer
- **Date Handling**: date-fns for date formatting
- **Build Tool**: Vite for fast development and building

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alpha-fx-trader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.jsx    # Main dashboard layout
│   ├── Header.jsx       # Navigation header
│   ├── PricePanel.jsx   # Live prices table
│   ├── ChartPanel.jsx   # Interactive price charts
│   ├── TradeExecution.jsx # Trade order form
│   ├── TradeBlotter.jsx # Trade history table
│   └── NotificationsPanel.jsx # Alerts and notifications
├── context/             # React Context for state management
│   └── AppContext.jsx   # Main application state
├── services/            # Data services
│   ├── mockDataService.js # Mock data simulation
│   └── apiService.js    # API service placeholders
├── App.jsx              # Main App component
├── main.jsx             # Application entry point
└── index.css            # Global styles
```

## Mock Data

The application currently uses mock data simulation for demonstration purposes:

- **Price Data**: Simulated forex prices with realistic fluctuations
- **Moving Averages**: Calculated SMA and EMA from price history
- **Trade History**: Sample trades with realistic data
- **Notifications**: System alerts and trade confirmations

## Backend Integration

The application is designed for easy backend integration. API service placeholders are included in `src/services/apiService.js` for:

- **Price API**: Real-time price data and historical data
- **Trade API**: Trade execution and history
- **User API**: User profile and settings
- **Notification API**: Alerts and notifications
- **Market API**: Market status and news
- **Auth API**: Authentication and authorization

### Environment Variables

Create a `.env` file for backend configuration:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001/ws
```

## Customization

### Adding New Currency Pairs

Edit `src/services/mockDataService.js`:

```javascript
const CURRENCY_PAIRS = [
  { symbol: 'EUR/USD', basePrice: 1.0850, spread: 0.0002 },
  { symbol: 'GBP/USD', basePrice: 1.2650, spread: 0.0003 },
  // Add new pairs here
  { symbol: 'USD/CHF', basePrice: 0.8750, spread: 0.0003 },
];
```

### Customizing Charts

Modify chart settings in `src/components/ChartPanel.jsx`:

```javascript
// Change moving average periods
const smaPeriod = 20; // Simple Moving Average period
const emaPeriod = 20; // Exponential Moving Average period

// Add new chart types
<Line type="monotone" dataKey="rsi" stroke="#8B5CF6" name="RSI" />
```

### Styling Customization

The application uses Tailwind CSS with custom components defined in `src/index.css`:

```css
@layer components {
  .card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700;
  }
  
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors;
  }
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Demo

The application includes a fully functional demo with:
- Simulated real-time price updates
- Interactive trading interface
- Complete trade history
- Responsive design
- Dark mode support

## Future Enhancements

- [ ] Real backend API integration
- [ ] WebSocket support for live data
- [ ] Advanced charting indicators (RSI, MACD, Bollinger Bands)
- [ ] Risk management tools
- [ ] Portfolio analytics
- [ ] Mobile app version
- [ ] Multi-language support
- [ ] Advanced order types (limit, stop-loss, take-profit)

## Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Note**: This is a frontend demonstration application. No real money is involved in the trading simulation.
