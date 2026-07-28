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
import EditProfilePage from "./pages/user/EditProfilePage";
import MyDocumentsPage from "./pages/user/MyDocumentsPage";
import UploadDocumentPage from "./pages/user/UploadDocumentPage";
import EditDocumentPage from "./pages/user/EditDocumentPage";
import SearchDocumentPage from "./pages/user/SearchDocumentPage";
import ChatHistoryPage from "./pages/user/ChatHistoryPage";
import UpgradeStoragePage from "./pages/user/UpgradeStoragePage";
import PaymentSuccessPage from "./pages/user/PaymentSuccessPage";
import NotificationsPage from "./pages/user/NotificationsPage";
import PublicAuthDocumentPage from "./pages/user/PublicAuthDocumentPage";
import UserDocumentDetailPage from "./pages/document/UserDocumentDetailPage";
import TransactionHistoryPage from "./pages/user/TransactionHistoryPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import PendingDocumentsPage from "./pages/admin/PendingDocumentsPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ReportManagementPage from "./pages/admin/ReportManagementPage";
import AiMetricsPage from "./pages/admin/AiMetricsPage";
import InterestSurveyPage from "./pages/auth/InterestSurveyPage";
import TagDocumentsPage from "./pages/user/TagDocumentsPage";

// Route Guards
function ProtectedRoute({ children }) {
  const { user } = useApp();
  if (!user) {
    if (sessionStorage.getItem('justLoggedOut') === 'true') {
      sessionStorage.removeItem('justLoggedOut');
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/auth/login" replace />;
  }
  return children;
}

function GuestRoute({ children }) {
  const { user } = useApp();
  if (user) {
    const isReallyAdmin = user?.role?.toLowerCase() === 'admin';
    return <Navigate to={isReallyAdmin ? '/admin/home' : '/user/home'} replace />;
  }
  return children;
}

function SmartHomeRoute() {
  const { user } = useApp();
  if (user) {
    const isReallyAdmin = user?.role?.toLowerCase() === 'admin';
    return <Navigate to={isReallyAdmin ? '/admin/home' : '/user/home'} replace />;
  }
  return <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const { user } = useApp();

  if (!user) {
    if (sessionStorage.getItem('justLoggedOut') === 'true') {
      sessionStorage.removeItem('justLoggedOut');
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/auth/login" replace />;
  }

  const currentRole = user?.role?.toLowerCase();

  if (currentRole !== 'admin') {
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
      { path: "google/callback", element: <LoginPage /> },
      { path: "verify-email", element: <GuestRoute><VerifyEmailPage /></GuestRoute> },
      { path: "forgot-password", element: <GuestRoute><ForgotPasswordPage /></GuestRoute> },
    ],
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />
  },

  // ĐÃ ĐIỀU CHỈNH: Độc lập hoàn toàn, không bọc trong MainLayout nên sẽ KHÔNG có Navbar/Footer
  {
    path: "/survey",
    element: <InterestSurveyPage />
  },

  {
    Component: MainLayout,
    children: [
      { path: "/", element: <GuestRoute><GuestHomePage /></GuestRoute> },
      { path: "/home", element: <SmartHomeRoute /> },
      { path: "/guest/document/:id", element: <GuestRoute><GuestDocumentDetailPage /></GuestRoute> },
      { path: "/guest/document/shared/:token", element: <GuestDocumentDetailPage /> },
      { path: "/user/home", element: <ProtectedRoute><UserHomePage /></ProtectedRoute> },
      { path: "/admin/home", element: <AdminRoute><AdminHomePage /></AdminRoute> },
      { path: "/profile", element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      { path: "/profile/edit", element: <ProtectedRoute><EditProfilePage /></ProtectedRoute> },
      { path: "/my-documents", element: <ProtectedRoute><MyDocumentsPage /></ProtectedRoute> },
      { path: "/upload", element: <ProtectedRoute><UploadDocumentPage /></ProtectedRoute> },
      { path: "/search", element: <SearchDocumentPage /> },
      { path: "/document/:id", element: <ProtectedRoute><UserDocumentDetailPage /></ProtectedRoute> },
      { path: "/document/:id/edit", element: <ProtectedRoute><EditDocumentPage /></ProtectedRoute> },
      { path: "/chat-history", element: <ProtectedRoute><ChatHistoryPage /></ProtectedRoute> },
      { path: "/upgrade", element: <ProtectedRoute><UpgradeStoragePage /></ProtectedRoute> },
      { path: "/payment-success", element: <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute> },
      { path: "/transaction-history", element: <ProtectedRoute><TransactionHistoryPage /></ProtectedRoute> },
      { path: "/notifications", element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
      { path: "/public-author-documents/:id", element: <ProtectedRoute><PublicAuthDocumentPage /></ProtectedRoute> },
      { path: "/tag/:tagName", element: <ProtectedRoute><TagDocumentsPage /></ProtectedRoute> },

      // Admin routes
      { path: "/admin/pending-documents", element: <AdminRoute><PendingDocumentsPage /></AdminRoute> },
      { path: "/admin/users", element: <AdminRoute><UserManagementPage /></AdminRoute> },
      { path: "/admin/reports", element: <AdminRoute><ReportManagementPage /></AdminRoute> },
      { path: "/admin/ai-metrics", element: <AdminRoute><AiMetricsPage /></AdminRoute> },
    ],
  },
]);