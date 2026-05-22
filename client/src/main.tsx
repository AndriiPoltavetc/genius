import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { store } from './app/store';
import App from './App';
import './styles/index.css';
import './i18n';

// Restore theme before first paint to avoid flash
const savedTheme = localStorage.getItem('genius_theme') ?? 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
