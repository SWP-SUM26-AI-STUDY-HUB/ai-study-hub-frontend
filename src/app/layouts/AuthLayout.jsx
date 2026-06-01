import React from 'react';
import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="auth-container">
      <Outlet /> {/* Đây là nơi các trang login, register... sẽ hiển thị */}
    </div>
  );
}