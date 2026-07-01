import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading để tránh văng về login lúc app đang khởi tạo

  // Khôi phục phiên đăng nhập khi F5
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('http://14.225.254.145:8080/api/v1/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          if (result.success) {
            setUser(result.data); // Khôi phục user thành công
          } else {
            localStorage.removeItem('token'); // Token hết hạn hoặc sai
          }
        } catch (error) {
          console.error("Lỗi khôi phục session:", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false); // Kết thúc quá trình kiểm tra
    };

    restoreSession();
  }, []);

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('http://14.225.254.145:8080/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Lỗi khi gọi API logout:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const toggleAdminMode = () => setIsAdminMode(!isAdminMode);

  const [selectedDocsForChat, setSelectedDocsForChat] = useState([]);

  const updateProfile = (updates) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        isAdminMode,
        setIsAdminMode,
        logout,
        toggleAdminMode,
        updateProfile,
        loading,
        selectedDocsForChat,
        setSelectedDocsForChat
      }}
    >
      {!loading && children} 
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