import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../../components/DashboardNavbar";
import { isLoggedIn } from "../../utils/auth";

const enquiryModules = [
  {
    name: "Enquiry Register",
    icon: "bi-clipboard2-data-fill",
    path: "enquiry/register",
    desc: "View, filter and manage all registered enquiries",
    color: "#1a4f8a",
  },
  {
    name: "Add Enquiry",
    icon: "bi-plus-circle-fill",
    path: "enquiry/add",
    desc: "Register a new RFQ / enquiry into the system",
    color: "#800000",
  },
];

export default function EnquiryHome() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

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
          <div className="d-flex align-items-center gap-2">
            <i
              className="bi bi-file-earmark-text-fill"
              style={{ fontSize: "1.3rem", color: "#800000" }}
            ></i>
            <h5 className="mb-0" style={{ color: "#800000", fontWeight: 700 }}>
              Enquiry &mdash; Select an Option
            </h5>
          </div>
        </div>
        <p className="text-muted mb-4" style={{ fontSize: "0.85rem" }}>
          Manage all RFQ enquiry data and quote registration in the Q2P system
        </p>

        {/* Cards */}
        <div className="row g-3">
          {enquiryModules.map((mod) => (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={mod.name}>
              <div
                className="submaster-card"
                onClick={() => navigate(`/${mod.path}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/${mod.path}`)}
                style={{ borderLeftColor: mod.color }}
              >
                <div className="submaster-icon">
                  <i
                    className={`bi ${mod.icon}`}
                    style={{ color: mod.color }}
                  ></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="submaster-name">{mod.name}</div>
                  <div
                    className="text-muted"
                    style={{ fontSize: "0.76rem", marginTop: "2px" }}
                  >
                    {mod.desc}
                  </div>
                </div>
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
