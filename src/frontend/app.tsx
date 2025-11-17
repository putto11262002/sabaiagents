import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

// Import styles
import "./styles/app.css";

// Import routes
import Layout from "./routes/layout";
import Home from "./routes/home";
import About from "./routes/about";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
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
