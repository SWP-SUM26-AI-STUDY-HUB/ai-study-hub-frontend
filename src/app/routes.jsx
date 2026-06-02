import { createBrowserRouter, Outlet } from "react-router"; 

import HomeRedirect from "./pages/HomeRedirect.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";

const AuthLayout = () => (
  <div className="auth-layout">
    <Outlet />
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomeRedirect,
  },
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "verify-email", Component: VerifyEmailPage },
      { path: "forgot-password", Component: ForgotPasswordPage }, 
    ],
  },
]);