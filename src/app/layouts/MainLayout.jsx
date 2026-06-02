import React from 'react';
import { Outlet } from 'react-router';

export function MainLayout() {
  return (
    <div className="main-container">
      <Outlet /> {}
    </div>
  );
}