import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../text-editor.jsx";
import "./app.css";

export function mountApp(node: ReactNode) {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Missing #root element in HTML");
  }

  createRoot(root).render(<StrictMode>{node}</StrictMode>);
}
