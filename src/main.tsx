import { createRoot } from "react-dom/client";
import { initStorage } from "./lib/storage";
import App from "./App.tsx";
import "./index.css";

initStorage().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
