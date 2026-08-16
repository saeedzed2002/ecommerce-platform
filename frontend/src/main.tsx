import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return <main>Ecommerce Platform</main>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
