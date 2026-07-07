import React, { createContext, useContext, useState, useEffect } from 'react';

// Tạo Context cho Theme
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Đọc cấu hình theme từ localStorage hoặc mặc định là light
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Tự động thêm/xóa thuộc tính data-theme vào thẻ <html> khi darkMode thay đổi
    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    // Hàm toggle chuyển đổi qua lại giữa 2 chế độ
    const toggleTheme = () => setDarkMode(prev => !prev);

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Hook tùy biến để các Component con gọi ngắn gọn hơn
export function useTheme() {
    return useContext(ThemeContext);
}