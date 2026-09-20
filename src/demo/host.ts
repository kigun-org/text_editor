// Plain-HTML fixture host (no React around the tag). Mirrors how Django renders
// <text-editor> with a child textarea. Used by tests/contract, input, teardown.
import "./app.css";
import basicTemplate from "../data/basic.json";

export type InputRecord = { id: string; notes: string; bubbles: boolean };

declare global {
  interface Window {
    __inputs: InputRecord[];
    __formSubmissions: Record<string, string>[];
  }
}

window.__inputs = [];
window.__formSubmissions = [];

const notes = JSON.stringify(basicTemplate);
document
  .querySelectorAll<HTMLTextAreaElement>("#editable > textarea, #readonly > textarea")
  .forEach((textarea) => {
    textarea.value = notes;
  });

const log = document.getElementById("inputs");
document.addEventListener("input", (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.localName !== "text-editor") return;
  const value =
    target.querySelector<HTMLTextAreaElement>(":scope > textarea")?.value ?? "";
  window.__inputs.push({ id: target.id, notes: value, bubbles: event.bubbles });
  const li = document.createElement("li");
  li.textContent = `${target.id}: ${value.length} chars`;
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
