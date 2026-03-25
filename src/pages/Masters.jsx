import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../components/DashboardNavbar";
import { isLoggedIn, getAuth } from "../utils/auth";

const NO_COUNT_KEYS = ["discount", "end-industry", "reason", "timeline-target"];

const subMasters = [
  {
    name: "Users Dept",
    icon: "bi-people-fill",
    path: "/masters/users-dept",
    key: "deptusers",
  },
  {
    name: "Sales Contact",
    icon: "bi-person-lines-fill",
    path: "/masters/sales-contact",
    key: "salescontact",
  },
  {
    name: "Customer",
    icon: "bi-building",
    path: "/masters/customer",
    key: "customer",
  },
  {
    name: "Buyer",
    icon: "bi-person-badge-fill",
    path: "/masters/buyer",
    key: "buyer",
  },
  {
    name: "Country",
    icon: "bi-globe2",
    path: "/masters/country",
    key: "country",
  },
  {
    name: "Product",
    icon: "bi-box-seam-fill",
    path: "/masters/product",
    key: "product",
  },
  {
    name: "Price",
    icon: "bi-currency-dollar",
    path: "/masters/price",
    key: "price",
  },
  {
    name: "GE Reference",
    icon: "bi-upc-scan",
    path: "/masters/ge-reference",
    key: "ge-reference",
  },
  {
    name: "Discount",
    icon: "bi-percent",
    path: "/masters/discount",
    key: "discount",
  },
  {
    name: "Special Discount",
    icon: "bi-star-fill",
    path: "/masters/spcl-discount",
    key: "spcl-discount",
  },
  {
    name: "End Industry",
    icon: "bi-building-gear",
    path: "/masters/end-industry",
    key: "end-industry",
  },
  {
    name: "Customer Type",
    icon: "bi-flag-fill",
    path: "/masters/country-type",
    key: "customer-type",
  },
  {
    name: "Status",
    icon: "bi-toggles",
    path: "/masters/status-master",
    key: "status-master",
  },
  {
    name: "Reason",
    icon: "bi-chat-square-text-fill",
    path: "/masters/reason",
    key: "reason",
  },
  {
    name: "Timeline Target",
    icon: "bi-calendar-range-fill",
    path: "/masters/timeline-target",
    key: "timeline-target",
  },
  {
    name: "Cost Price",
    icon: "bi-receipt-cutoff",
    path: "/masters/cost-price",
    key: "cost-price",
  },
  {
    name: "Privileges",
    icon: "bi-shield-lock-fill",
    path: "/masters/privileged",
    key: "privileged",
  },
];

const API_KEY_MAP = {
  deptusers: "deptusers",
  salescontact: "salescontact",
  customer: "customer",
  buyer: "buyer",
  country: "country",
  product: "product",
  price: "price",
  "ge-reference": "gereference",
  "spcl-discount": "spcl-discount",
  "customer-type": "customer-type", // ← UPDATED (was "country-type": "country-type")
  "status-master": "status-master",
  "cost-price": "cost-price",
  privileged: "privileged",
};

export default function Masters() {
  const navigate = useNavigate();
  const { token } = getAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [counts, setCounts] = useState({});
  const [failedKeys, setFailedKeys] = useState(new Set());

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  useEffect(() => {
    subMasters.forEach(async (sub) => {
      if (NO_COUNT_KEYS.includes(sub.key)) return;
      const apiSeg = API_KEY_MAP[sub.key];
      if (!apiSeg) return;
      try {
        const { data } = await axios.get(
          `http://localhost:5001/api/${apiSeg}/counts`,
          { headers },
        );
        setCounts((prev) => ({ ...prev, [sub.key]: data }));
      } catch {
        setFailedKeys((prev) => new Set([...prev, sub.key]));
      }
    });
  }, [token]);

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-4 py-4">
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
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
                Masters --- Select a Sub-Master
              </h5>
            </div>
            <p className="text-muted mb-0 mt-1" style={{ fontSize: "0.85rem" }}>
              Manage all master data used across the Q2P system
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="row g-3">
          {subMasters.map((sub) => {
            const showCount = !NO_COUNT_KEYS.includes(sub.key);
            const cnt = counts[sub.key];
            const failed = failedKeys.has(sub.key);

            return (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={sub.key}>
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

                  {showCount && cnt && (
                    <div
                      className="d-flex gap-2 justify-content-center flex-wrap"
                      style={{ marginTop: "8px" }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#fff",
                          backgroundColor: "#2e7d32",
                          borderRadius: "999px",
                          padding: "2px 10px",
                          letterSpacing: "0.02em",
                        }}
                      >
                        Active : {cnt.active}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#fff",
                          backgroundColor: "#c62828",
                          borderRadius: "999px",
                          padding: "2px 10px",
                          letterSpacing: "0.02em",
                        }}
                      >
                        Inactive : {cnt.inactive}
                      </span>
                    </div>
                  )}

                  {showCount && !cnt && !failed && (
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#bbb",
                        marginTop: "6px",
                      }}
                    >
                      Loading...
                    </div>
                  )}

                  <div className="submaster-arrow">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
