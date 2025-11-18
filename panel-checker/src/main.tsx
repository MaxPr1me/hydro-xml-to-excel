import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const resolveBasename = () => {
  const rawBase = import.meta.env.BASE_URL ?? '/';

  if (rawBase.startsWith('.')) {
    const pathname = new URL(rawBase, window.location.href).pathname;
    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  }

  if (rawBase !== '/' && rawBase.endsWith('/')) {
    return rawBase.slice(0, -1);
  }

  return rawBase || '/';
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={resolveBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
