import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import { isLoggedIn, getAuth } from "../utils/auth";

const modules = [
  {
    name: "Masters",
    icon: "bi-database-fill-gear",
    path: "/masters",
    color: "#800000",
  },
  {
    name: "Enquiry",
    icon: "bi-file-earmark-text-fill",
    path: "/enquiry",
    color: "#1a4f8a",
  },
  {
    name: "Technical Offer",
    icon: "bi-tools",
    path: "/technical-offer",
    color: "#5a2d82",
  },
  {
    name: "Price Offer",
    icon: "bi-tag-fill",
    path: "/price-offer",
    color: "#0f6b3d",
  },
  {
    name: "Approval",
    icon: "bi-check-circle-fill",
    path: "/approval",
    color: "#b85c00",
  },
  {
    name: "Price Upload",
    icon: "bi-cloud-upload-fill",
    path: "/price-upload",
    color: "#2a6b7c",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-4 py-4">
        {/* Welcome Banner */}
        <div className="welcome-banner mb-4">
          <div className="d-flex align-items-center gap-2">
            <i
              className="bi bi-grid-fill"
              style={{ fontSize: "1.4rem", color: "#800000" }}
            ></i>
            <h5 className="mb-0" style={{ color: "#800000", fontWeight: 700 }}>
              Dashboard — Select a Module
            </h5>
          </div>
          <p className="text-muted mb-0 mt-1" style={{ fontSize: "0.88rem" }}>
            Logged in as{" "}
            <strong>
              {user?.firstname} {user?.lastname}
            </strong>{" "}
            &nbsp;|&nbsp; Role: <strong>{user?.role}</strong> &nbsp;|&nbsp;
            Site: <strong>{user?.site}</strong>
          </p>
        </div>

        {/* Module Cards */}
        <div className="row g-3">
          {modules.map((mod) => (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={mod.name}>
              <div
                className="module-card"
                style={{ borderTop: `4px solid ${mod.color}` }}
                onClick={() => navigate(mod.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(mod.path)}
              >
                <div className="module-icon" style={{ color: mod.color }}>
                  <i className={`bi ${mod.icon}`}></i>
                </div>
                <div className="module-name">{mod.name}</div>
                <div className="module-arrow" style={{ color: mod.color }}>
                  <i className="bi bi-arrow-right-circle-fill"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
