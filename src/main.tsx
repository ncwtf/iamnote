import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

// 屏蔽浏览器默认右键菜单（检查元素、后退等）
document.addEventListener("contextmenu", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
