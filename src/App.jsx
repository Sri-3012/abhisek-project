import React from 'react';
import { AppProvider } from './context/AppContext';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Dashboard />
      </div>
    </AppProvider>
  );
}

export default App;
