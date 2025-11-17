// Vite modulepreload polyfill for backend integration
import 'vite/modulepreload-polyfill';

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

// Import styles
import "./styles/app.css";

// Import routes
import Layout from "./routes/layout.js";
import Dashboard from "./routes/dashboard.js";
import Home from "./routes/home.js";
import About from "./routes/about.js";
import { PromptEditorPage } from "./routes/prompt-editor.js";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="home" element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="prompt-editor" element={<PromptEditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Mount the app
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
