import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

console.log('Main.tsx loaded');

const rootElement = document.getElementById("root");
console.log('Root element found:', rootElement);

if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Creating React root and rendering App');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
