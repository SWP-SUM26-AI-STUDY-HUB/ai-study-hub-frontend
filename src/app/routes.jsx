import { createBrowserRouter, Navigate } from "react-router";
import { useApp } from "./context/AppContext";
import { AuthLayout } from "./layouts/AuthLayout";
import { MainLayout } from "./layouts/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

import GuestHomePage from "./pages/guest/GuestHomePage";
import GuestDocumentDetailPage from "./pages/document/GuestDocumentDetailPage";
import UserHomePage from "./pages/user/HomePage";
import ProfilePage from "./pages/user/ProfilePage";
import MyDocumentsPage from "./pages/user/MyDocumentsPage";
import UploadDocumentPage from "./pages/user/UploadDocumentPage";
import ViewDocumentPage from "./pages/user/ViewDocumentPage";
import EditDocumentPage from "./pages/user/EditDocumentPage";
import SearchDocumentPage from "./pages/user/SearchDocumentPage";
import ChatHistoryPage from "./pages/user/ChatHistoryPage";
import UpgradeStoragePage from "./pages/user/UpgradeStoragePage";
import UserDocumentDetailPage from "./pages/document/UserDocumentDetailPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import PendingDocumentsPage from "./pages/admin/PendingDocumentsPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ReportManagementPage from "./pages/admin/ReportManagementPage";

// Route Guards
function ProtectedRoute({ children }) {
  const { user } = useApp();
  return user ? children : <Navigate to="/auth/login" replace />;
}

function GuestRoute({ children }) {
  const { user } = useApp();
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin/home' : '/user/home'} replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { user, isAdminMode } = useApp();
  if (!user || user.role !== 'admin' || !isAdminMode) {
    return <Navigate to="/user/home" replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: "register", element: <GuestRoute><RegisterPage /></GuestRoute> },
      { path: "verify-email", element: <GuestRoute><VerifyEmailPage /></GuestRoute> },
      { path: "forgot-password", element: <GuestRoute><ForgotPasswordPage /></GuestRoute> },
      { path: "reset-password", element: <GuestRoute><ResetPasswordPage /></GuestRoute> },
    ],
  },
  {
    // PATHLESS ROUTE: Chỉ dùng để bọc giao diện MainLayout (Header, Footer, Hero)
    Component: MainLayout,
    children: [
      { path: "/", element: <GuestRoute><GuestHomePage /></GuestRoute> },
      { path: "/guest/document/:id", element: <GuestRoute><GuestDocumentDetailPage /></GuestRoute> },
      { path: "/user/home", element: <ProtectedRoute><UserHomePage /></ProtectedRoute> },
      { path: "/admin/home", element: <AdminRoute><AdminHomePage /></AdminRoute> },
      { path: "/profile", element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      { path: "/my-documents", element: <ProtectedRoute><MyDocumentsPage /></ProtectedRoute> },
      { path: "/upload", element: <ProtectedRoute><UploadDocumentPage /></ProtectedRoute> },
      { path: "/search", element: <SearchDocumentPage /> },
      { path: "/document/:id", element: <ProtectedRoute><UserDocumentDetailPage /></ProtectedRoute> },
      { path: "/document/:id/view", element: <ProtectedRoute><ViewDocumentPage /></ProtectedRoute> },
      { path: "/document/:id/edit", element: <ProtectedRoute><EditDocumentPage /></ProtectedRoute> },
      { path: "/chat-history", element: <ProtectedRoute><ChatHistoryPage /></ProtectedRoute> },
      { path: "/upgrade", element: <ProtectedRoute><UpgradeStoragePage /></ProtectedRoute> },

      // Admin routes
      { path: "/admin/pending-documents", element: <AdminRoute><PendingDocumentsPage /></AdminRoute> },
      { path: "/admin/users", element: <AdminRoute><UserManagementPage /></AdminRoute> },
      { path: "/admin/reports", element: <AdminRoute><ReportManagementPage /></AdminRoute> },
    ],
  },
]);
