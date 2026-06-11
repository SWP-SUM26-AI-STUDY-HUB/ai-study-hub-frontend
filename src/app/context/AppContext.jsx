import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const logout = () => {
    setUser(null);
    setIsAdminMode(false);
    
    // Xóa Dual JWT đã lưu khi người dùng đăng xuất
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode);
  };

  const updateProfile = (updates) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser, // QUAN TRỌNG: Đã thêm setUser để LoginPage gọi được sau khi API login thành công
        isAuthenticated: !!user,
        isAdminMode,
        setIsAdminMode,
        logout, // Login và Register giả đã được xóa, chỉ giữ lại logout
        toggleAdminMode,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
