import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { isLoggedIn, getAuth } from "../../utils/auth";

const API = "http://localhost:5001";

const enquiryModules = [
  {
    name: "Enquiry Register",
    icon: "bi-clipboard2-data-fill",
    path: "/enquiry/register",
    desc: "View, filter and manage all registered enquiries",
    color: "#1a4f8a",
    bg: "#e8f0fb",
  },
  {
    name: "Add Enquiry",
    icon: "bi-plus-circle-fill",
    path: "/enquiry/add",
    desc: "Register a new RFQ enquiry into the system",
    color: "#800000",
    bg: "#fff0f0",
  },
];

export default function EnquiryHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, enquiry: 0, quoted: 0 });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
      return;
    }
    const headers = { Authorization: `Bearer ${getAuth()}` };
    axios
      .get(`${API}/api/enquiry`, { headers })
      .then((r) => {
        const rows = r.data;
        setStats({
          total: rows.length,
          enquiry: rows.filter((x) => x.Quotestage?.toLowerCase() === "enquiry")
            .length,
          quoted: rows.filter((x) =>
            ["priced offer", "technical offer", "quoted"].includes(
              x.Quotestage?.toLowerCase(),
            ),
          ).length,
        });
      })
      .catch(() => {});
  }, []); // eslint-disable-line

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
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <div className="d-flex align-items-center gap-2">
            <i
              className="bi bi-file-earmark-text-fill"
              style={{ fontSize: "1.3rem", color: "#800000" }}
            />
            <h5 className="mb-0" style={{ color: "#800000", fontWeight: 700 }}>
              Enquiry &mdash; Select an Option
            </h5>
          </div>
        </div>

        {/* Stats banner */}
        <div className="row g-3 mb-4">
          {[
            {
              label: "Total Enquiries",
              value: stats.total,
              icon: "bi-collection-fill",
              color: "#800000",
              bg: "#fff0f0",
            },
            {
              label: "In Enquiry Stage",
              value: stats.enquiry,
              icon: "bi-hourglass-split",
              color: "#1a4f8a",
              bg: "#e8f0fb",
            },
            {
              label: "Quoted",
              value: stats.quoted,
              icon: "bi-check2-circle",
              color: "#065f46",
              bg: "#d1fae5",
            },
          ].map((s) => (
            <div className="col-12 col-sm-4" key={s.label}>
              <div
                style={{
                  background: s.bg,
                  borderRadius: 8,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 8,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  <i
                    className={`bi ${s.icon}`}
                    style={{ color: s.color, fontSize: "1.2rem" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: "#666", marginTop: 2 }}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Module cards */}
        <div className="row g-3">
          {enquiryModules.map((mod) => (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={mod.name}>
              <div
                className="submaster-card"
                onClick={() => navigate(mod.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(mod.path)}
                style={{ borderLeftColor: mod.color, cursor: "pointer" }}
              >
                <div
                  className="submaster-icon"
                  style={{ background: mod.bg, borderRadius: 8, padding: 8 }}
                >
                  <i
                    className={`bi ${mod.icon}`}
                    style={{ color: mod.color }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="submaster-name">{mod.name}</div>
                  <div
                    className="text-muted"
                    style={{ fontSize: "0.76rem", marginTop: 2 }}
                  >
                    {mod.desc}
                  </div>
                </div>
                <div className="submaster-arrow">
                  <i className="bi bi-chevron-right" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
