// React is already imported below - removing duplicate import

// Polyfill for global object required by Magenta.js dependencies
if (typeof window !== 'undefined') {
  // Define global object first
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }

  // Define minimal process object with required properties
  (window as any).process = {
    env: {},
    stdout: { write: () => {}, fd: 1 },
    stderr: { write: () => {}, fd: 2 },
    stdin: { fd: 0 },
    argv: [],
    version: '',
    versions: {
      http_parser: '',
      node: '',
      v8: '',
      ares: '',
      uv: '',
      zlib: '',
      modules: '',
      openssl: ''
    },
    platform: 'win32',
    nextTick: (fn: Function) => setTimeout(fn, 0),
    cwd: () => '/',
    chdir: () => { throw new Error('Not implemented'); }
  };

  // Ensure Buffer is available
  if (typeof Buffer === 'undefined') {
    import('buffer').then(buffer => {
      (window as any).Buffer = buffer.Buffer;
    });
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);