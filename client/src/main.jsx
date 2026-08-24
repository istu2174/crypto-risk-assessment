// === Polyfills buat Solana wallet adapter di browser ===
// Wallet adapter (dan @solana/web3.js) pakai Node.js globals: Buffer, global, process.
// Vite gak auto-polyfill, jadi kita expose manual sebelum import App.
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  window.global = window.global || window;
  window.process = window.process || { env: {} };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
