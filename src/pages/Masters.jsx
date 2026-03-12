import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import { isLoggedIn } from "../utils/auth";

const subMasters = [
  { name: "Users Dept", icon: "bi-people-fill", path: "/masters/users-dept" },
  {
    name: "Sales Contact",
    icon: "bi-person-lines-fill",
    path: "/masters/sales-contact",
  },
  { name: "Customer", icon: "bi-building", path: "/masters/customer" },
  { name: "Buyer", icon: "bi-person-badge-fill", path: "/masters/buyer" },
  { name: "Country", icon: "bi-globe2", path: "/masters/country" },
  { name: "Product", icon: "bi-box-seam-fill", path: "/masters/product" },
  { name: "Price", icon: "bi-currency-dollar", path: "/masters/price" },
  { name: "GE Reference", icon: "bi-upc-scan", path: "/masters/ge-reference" },
  { name: "Discount", icon: "bi-percent", path: "/masters/discount" },
  {
    name: "Special Discount",
    icon: "bi-star-fill",
    path: "/masters/spcl-discount",
  },
  {
    name: "End Industry",
    icon: "bi-building-gear",
    path: "/masters/end-industry",
  },
  { name: "Country Type", icon: "bi-flag-fill", path: "/masters/country-type" },
  { name: "Status", icon: "bi-toggles", path: "/masters/status-master" },
  { name: "Reason", icon: "bi-chat-square-text-fill", path: "/masters/reason" },
  {
    name: "Timeline Target",
    icon: "bi-calendar-range-fill",
    path: "/masters/timeline-target",
  },
  {
    name: "Cost Price",
    icon: "bi-receipt-cutoff",
    path: "/masters/cost-price",
  },
  {
    name: "Privileges",
    icon: "bi-shield-lock-fill",
    path: "/masters/privileged",
  },
];

export default function Masters() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-4 py-4">
        {/* Header with Back button */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            <i className="bi bi-arrow-left-circle-fill me-1"></i> Back
          </button>
          <div>
            <div className="d-flex align-items-center gap-2">
              <i
                className="bi bi-database-fill-gear"
                style={{ fontSize: "1.3rem", color: "#800000" }}
              ></i>
              <h5
                className="mb-0"
                style={{ color: "#800000", fontWeight: 700 }}
              >
                Masters — Select a Sub-Master
              </h5>
            </div>
            <p className="text-muted mb-0 mt-1" style={{ fontSize: "0.85rem" }}>
              Manage all master data used across the Q2P system
            </p>
          </div>
        </div>

        {/* Sub-Master Cards */}
        <div className="row g-3">
          {subMasters.map((sub) => (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={sub.name}>
              <div
                className="submaster-card"
                onClick={() => navigate(sub.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(sub.path)}
              >
                <div className="submaster-icon">
                  <i className={`bi ${sub.icon}`}></i>
                </div>
                <div className="submaster-name">{sub.name}</div>
                <div className="submaster-arrow">
                  <i className="bi bi-chevron-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
