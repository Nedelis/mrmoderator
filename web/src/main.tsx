import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';

import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { RolesProvider } from './contexts/RolesContext';
import { CurrentUserProvider } from './contexts/CurrentUserContext';
import { ToastProvider } from './components/Toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <RolesProvider>
            <CurrentUserProvider>
              <App />
            </CurrentUserProvider>
          </RolesProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);