import { useNavigate } from "react-router-dom";
import { clearAuth, getAuth } from "../utils/auth";

export default function DashboardNavbar() {
  const navigate = useNavigate();
  const { user } = getAuth();

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="dash-navbar">
      {/* Left */}
      <span className="brand-left">CircorFlow</span>

      {/* Center */}
      <span className="brand-center">Q2P System</span>

      {/* Right */}
      <div
        className="d-flex align-items-center"
        style={{ minWidth: "140px", justifyContent: "flex-end" }}
      >
        {user && (
          <span className="welcome-text me-2">
            Welcome, {user.firstname} ({user.role})
          </span>
        )}
        <div className="nav-icons d-flex align-items-center">
          <a href="/dashboard" title="Home">
            <i className="bi bi-house-fill"></i>
          </a>
          <a
            href="#"
            title="Logout"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <i className="bi bi-box-arrow-right"></i>
          </a>
        </div>
      </div>
    </nav>
  );
}
