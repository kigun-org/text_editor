import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { installMockUnpoly } from "./saveDocument";
import "./app.css";

installMockUnpoly();

export function mountApp(node: ReactNode) {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Missing #root element in HTML");
  }

  createRoot(root).render(<StrictMode>{node}</StrictMode>);
}
