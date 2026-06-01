import React from 'react';
import { Outlet } from 'react-router';

export function MainLayout() {
  return (
    <div className="main-container">
      <Outlet /> {/* Đây là nơi các trang của user/admin sau khi đăng nhập sẽ hiển thị */}
    </div>
  );
}