import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

// 可编辑区域和已选中文本保留系统右键（复制/粘贴），其它地方关掉浏览器菜单
document.addEventListener("contextmenu", (e) => {
  const el = e.target as HTMLElement | null;
  if (el?.closest("input, textarea, [contenteditable='true']")) return;
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed) return;
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
