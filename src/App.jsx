import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import Dashboard from "./pages/Dashboard";
import Masters from "./pages/Masters";
import UsersDept from "./pages/masters/UsersDept";
import SalesContact from "./pages/masters/SalesContact";
import Customer from "./pages/masters/Customer";
import Buyer from "./pages/masters/Buyer";
import { isLoggedIn } from "./utils/auth";

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}
function PublicRoute({ children }) {
  return !isLoggedIn() ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/create-account"
          element={
            <PublicRoute>
              <CreateAccount />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters"
          element={
            <ProtectedRoute>
              <Masters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/users-dept"
          element={
            <ProtectedRoute>
              <UsersDept />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/sales-contact"
          element={
            <ProtectedRoute>
              <SalesContact />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/customer"
          element={
            <ProtectedRoute>
              <Customer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/buyer"
          element={
            <ProtectedRoute>
              <Buyer />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
