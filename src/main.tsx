import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WorldApp from "./world/scene/WorldApp";
import "./world/world.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorldApp />
  </StrictMode>
);
