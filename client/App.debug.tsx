import "./global.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ModeSelector } from "./pages/ModeSelector";

function DebugApp() {
  return (
    <BrowserRouter>
      <div>
        <h1>Debug Mode</h1>
        <ModeSelector onModeSelect={(mode) => console.log('Selected:', mode)} />
      </div>
    </BrowserRouter>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<DebugApp />);
}
