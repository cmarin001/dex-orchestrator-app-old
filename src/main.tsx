import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "@atlaskit/css-reset";
import "./terminal.css";

const root = document.getElementById("root");
if (!root) throw new Error("Dashboard mount element is missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);
