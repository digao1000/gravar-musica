import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

console.log('Main.tsx loaded');

try {
  const rootElement = document.getElementById("root");
  console.log('Root element found:', rootElement);

  if (!rootElement) {
    console.error('Root element not found!');
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Erro: Elemento root não encontrado</div>';
  } else {
    console.log('Creating React root and rendering App');
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('App rendered successfully');
  }
} catch (error) {
  console.error('Error during app initialization:', error);
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Erro na inicialização: ${errorMessage}</div>`;
}
