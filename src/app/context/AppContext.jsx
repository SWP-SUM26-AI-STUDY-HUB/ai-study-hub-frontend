import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Gọi API báo Backend hủy phiên đăng nhập
      if (token) {
        await fetch('http://14.225.254.145:8080/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // Rất quan trọng!
            'Accept': '*/*'
          }
        });
      }
    } catch (error) {
      console.error('Lỗi khi gọi API logout:', error);
    } finally {
      // Dọn dẹp nhà cửa bất chấp API có chạy thành công hay không
      localStorage.removeItem('token');
      setUser(null);
    }
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
