import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { MessageCountProvider } from './lib/messageCount.jsx';
import './assets/style/style.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MessageCountProvider>
        <App />
      </MessageCountProvider>
    </BrowserRouter>
  </StrictMode>,
);
