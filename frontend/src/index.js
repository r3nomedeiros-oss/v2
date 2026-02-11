import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { register } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Registrar o Service Worker para PWA
register({
  onSuccess: () => {
    console.log('PWA: Conteúdo cacheado para uso offline.');
  },
  onUpdate: () => {
    console.log('PWA: Nova versão disponível! Atualize a página.');
  }
});
