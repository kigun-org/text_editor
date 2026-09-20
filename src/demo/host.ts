// Plain-HTML fixture host (no React around the tag). Mirrors how Django renders
// <text-editor> with a child textarea. Used by tests/contract, save, teardown.
import "./app.css";
import basicTemplate from "../data/basic.json";

declare global {
  interface Window {
    __saves: { id: string; detail: string; bubbles: boolean }[];
    __formSubmissions: Record<string, string>[];
  }
}

window.__saves = [];
window.__formSubmissions = [];

const notes = JSON.stringify(basicTemplate);
document
  .querySelectorAll<HTMLTextAreaElement>("#editable > textarea, #readonly > textarea")
  .forEach((textarea) => {
    textarea.value = notes;
  });

const log = document.getElementById("saves");
document.addEventListener("save", (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.localName !== "text-editor") return;
  const detail = (event as CustomEvent<string>).detail;
  window.__saves.push({ id: target.id, detail, bubbles: event.bubbles });
  const li = document.createElement("li");
  li.textContent = `${target.id}: ${detail.length} chars`;
  log?.appendChild(li);
});

document.getElementById("form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget as HTMLFormElement);
  window.__formSubmissions.push(
    Object.fromEntries([...data.entries()].map(([k, v]) => [k, String(v)])),
  );
});

// Textareas are filled before the tag is defined so mount() reads them.
await import("../text-editor.jsx");
