import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { MessageCountProvider } from '@/context/MessageCountContext.jsx';
import '@/assets/style/style.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MessageCountProvider>
          <App />
        </MessageCountProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
