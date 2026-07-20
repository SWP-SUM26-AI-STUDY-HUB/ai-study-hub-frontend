import "./app/api.js";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/index.css";

import { ThemeProvider } from "./app/context/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);