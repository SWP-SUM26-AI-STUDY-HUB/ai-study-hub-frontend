import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const login = (email, password) => {
    // Nếu email là admin@studydocs.ai thì set role = admin
    const isAdmin = email === 'admin@studydocs.ai';
    setUser({
      id: isAdmin ? 'admin-1' : '1',
      name: isAdmin ? 'Admin User' : 'John Doe',
      email,
      avatar: '',
      major: isAdmin ? 'System Admin' : 'Computer Science',
      storageUsed: 1.5 * 1024 * 1024 * 1024,
      storageLimit: 2 * 1024 * 1024 * 1024,
      isPremium: false,
      role: isAdmin ? 'admin' : 'user',
    });
    setIsAdminMode(isAdmin);
  };

  const logout = () => {
    setUser(null);
    setIsAdminMode(false);
  };

  const register = (name, email, password) => {
    setUser({
      id: '1',
      name,
      email,
      avatar: '',
      major: '',
      storageUsed: 0,
      storageLimit: 2 * 1024 * 1024 * 1024,
      isPremium: false,
      role: 'user',
    });
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
        isAuthenticated: !!user,
        isAdminMode,
        login,
        logout,
        register,
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
