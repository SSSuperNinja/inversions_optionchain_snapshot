import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Asegúrate de que esta línea exista

// 1. IMPORTAR EL PROVEEDOR DE TEMAS
import { ThemeProvider } from '@ui5/webcomponents-react';

ReactDOM.createRoot(document.getElementById('root')).render(
  // 2. ENVOLVER TODA LA APP AQUÍ
  <ThemeProvider>
    <App />
  </ThemeProvider>
);