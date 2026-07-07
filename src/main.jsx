import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/index.css";

// ĐÃ SỬA ĐƯỜNG DẪN: Đi vào đúng thư mục app/context theo cấu hình cây thư mục thực tế
import { ThemeProvider } from "./app/context/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);