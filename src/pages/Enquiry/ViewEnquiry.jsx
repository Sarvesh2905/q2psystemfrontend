import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";

function fmt(val) {
  if (!val) return "—";
  return val;
}

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function stageBadgeClass(stage) {
  if (!stage) return "enq-stage-default";
  const s = stage.toLowerCase();
  if (s === "enquiry") return "enq-stage-enquiry";
  if (s === "quoted") return "enq-stage-quoted";
  if (s === "won") return "enq-stage-won";
  if (s === "regret") return "enq-stage-regret";
  if (s === "cancelled") return "enq-stage-cancelled";
  if (s === "lost") return "enq-stage-lost";
  return "enq-stage-default";
}

function priorityClass(p) {
  if (!p) return "";
  const v = p.toLowerCase();
  if (v === "high") return "enq-priority-high";
  if (v === "medium") return "enq-priority-medium";
  return "enq-priority-low";
}

/* ── small reusable view field ── */
function Field({ label, value, highlight }) {
  return (
    <div className="enq-view-field">
      <span className="enq-view-label">{label}</span>
      <span
        className={`enq-view-value ${!value || value === "—" ? "empty" : ""} ${highlight || ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
export default function ViewEnquiry() {
  const { quotenumber } = useParams();
  const navigate = useNavigate();
  const { token } = getAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Quote generation state */
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quoteAlert, setQuoteAlert] = useState({ msg: "", type: "" });

  const showQAlert = (msg, type) => {
    setQuoteAlert({ msg, type });
    setTimeout(() => setQuoteAlert({ msg: "", type: "" }), 4500);
  };

  /* ── fetch enquiry ── */
  useEffect(() => {
    axios
      .get(`${API}/api/enquiry/${encodeURIComponent(quotenumber)}`, { headers })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load enquiry data.");
        setLoading(false);
      });
  }, [quotenumber]); // eslint-disable-line

  /* ── generate quote ── */
  const handleGenerateQuote = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/api/enquiry/generate-quote`,
        { quotenumber },
        { headers },
      );
      showQAlert(
        `Quote generated successfully! Quote No: ${res.data.quoteNumber || quotenumber}`,
        "success",
      );
      setTimeout(() => {
        setShowQuoteModal(false);
        navigate("/enquiry/register");
      }, 2000);
    } catch (err) {
      showQAlert(
        err.response?.data?.message || "Failed to generate quote. Try again.",
        "danger",
      );
    } finally {
      setGenerating(false);
    }
  };

  /* ── guards ── */
  if (loading) {
    return (
      <>
        <DashboardNavbar />
        <div className="enq-loading mt-5">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading enquiry...
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <DashboardNavbar />
        <div className="enq-error-msg mt-4 mx-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error || "Enquiry not found."}
        </div>
      </>
    );
  }

  const products = data.Product
    ? data.Product.split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const canGenerateQuote = !["CANCELLED", "REGRET"].includes(
    data.Quotestage?.toUpperCase(),
  );

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-3 py-3">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/enquiry/register")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Enquiry &rsaquo; Register &rsaquo;{" "}
            <strong>{data.Quotenumber}</strong>
          </span>
        </div>

        {/* Page Title */}
        <h5 className="master-page-title mb-1">
          <i className="bi bi-eye-fill me-2"></i>View Enquiry
        </h5>
        <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
          Quote No:{" "}
          <strong style={{ color: "#800000" }}>{data.Quotenumber}</strong>
          &nbsp;&nbsp;|&nbsp;&nbsp;Rev: <strong>{data.Rev ?? 0}</strong>
          &nbsp;&nbsp;|&nbsp;&nbsp;Stage:{" "}
          <span
            className={`enq-stage-badge ${stageBadgeClass(data.Quotestage)}`}
          >
            {data.Quotestage || "—"}
          </span>
        </p>

        {/* ── QUOTE GENERATION BANNER ── */}
        {canGenerateQuote && (
          <div className="enq-quote-banner mb-3">
            <div>
              <div className="enq-quote-banner-title">
                <i className="bi bi-file-earmark-check-fill me-2"></i>
                Ready to Generate Quote?
              </div>
              <div className="enq-quote-banner-sub">
                Enquiry <strong>{data.Quotenumber}</strong> &mdash;{" "}
                {data.Projectname || "No project name"}
              </div>
            </div>
            <button
              className="btn enq-btn-generate-quote"
              onClick={() => setShowQuoteModal(true)}
            >
              <i className="bi bi-lightning-charge-fill me-1"></i>
              Generate Quote
            </button>
          </div>
        )}

        {/* Edit button row */}
        <div className="d-flex justify-content-end mb-3 gap-2">
          <button
            className="btn btn-sm"
            style={{
              background: "#800000",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: "0.83rem",
            }}
            onClick={() =>
              navigate(`/enquiry/edit/${encodeURIComponent(data.Quotenumber)}`)
            }
          >
            <i className="bi bi-pencil-fill me-1"></i>Edit Enquiry
          </button>
        </div>

        {/* ══════════════════════════════════════
             SECTION 1 — CUSTOMER
        ══════════════════════════════════════ */}
        <div className="enq-view-card">
          <div className="enq-view-section-title">
            <i className="bi bi-building me-2"></i>1. Customer
          </div>
          <div className="enq-view-grid">
            <Field label="Customer Name" value={fmt(data.Customername)} />
            <Field label="Customer Category" value={fmt(data.Customertype)} />
            <Field label="Customer Country" value={fmt(data.CustomerCountry)} />
            <Field label="Buyer Name" value={fmt(data.Buyername)} />
            <Field label="Group" value={fmt(data.Groupname)} />
            <Field label="Currency" value={fmt(data.Currency)} />
            <Field label="End User Name" value={fmt(data.Endusername)} />
            <Field label="End User Country" value={fmt(data.EndCountry)} />
            <Field label="End Industry" value={fmt(data.EndIndustry)} />
          </div>
        </div>

        {/* ══════════════════════════════════════
             SECTION 2 — RFQ
        ══════════════════════════════════════ */}
        <div className="enq-view-card">
          <div className="enq-view-section-title">
            <i className="bi bi-file-earmark-text me-2"></i>2. RFQ Details
          </div>
          <div className="enq-view-grid">
            <Field label="RFQ Receipt Date" value={fmtDate(data.RFQDate)} />
            <Field label="App. Engineer" value={fmt(data.Deptuser)} />
            <Field label="Sales Contact" value={fmt(data.Salescontact)} />
            <Field label="Opportunity Type" value={fmt(data.RFQType)} />
            <Field label="Category" value={fmt(data.RFQCategory)} />
          </div>

          {/* RFQ Reference full width */}
          <div className="mt-3">
            <div className="enq-view-label">RFQ Reference</div>
            <div
              className="enq-view-value mt-1"
              style={{
                background: "#f9f9f9",
                border: "1px solid #eee",
                borderRadius: 5,
                padding: "8px 12px",
                whiteSpace: "pre-wrap",
                fontSize: "0.83rem",
              }}
            >
              {data.RFQreference || "—"}
            </div>
          </div>

          {/* Comments (if any) */}
          {data.Comments && (
            <div className="mt-3">
              <div className="enq-view-label">Register Dt. Comments</div>
              <div
                className="enq-view-value mt-1"
                style={{
                  background: "#fff8f0",
                  border: "1px solid #ffe0b2",
                  borderRadius: 5,
                  padding: "8px 12px",
                  whiteSpace: "pre-wrap",
                  fontSize: "0.83rem",
                }}
              >
                {data.Comments}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════
             SECTION 3 — PRODUCT
        ══════════════════════════════════════ */}
        <div className="enq-view-card">
          <div className="enq-view-section-title">
            <i className="bi bi-box-seam me-2"></i>3. Product
          </div>

          <div className="enq-product-layout">
            <div className="enq-view-grid">
              <Field label="Facing Factory" value={fmt(data.Facingfactory)} />
              <Field label="Lines in RFQ" value={fmt(data.Totallineitems)} />
              <Field
                label="Customer Due Date"
                value={fmtDate(data.CustomerdueDate)}
              />
              <Field
                label="Proposed Due Date"
                value={fmtDate(data.ProposeddueDate)}
              />
              <Field
                label="Win Probability"
                value={fmt(data.Winprob)}
                highlight={
                  data.Winprob?.toUpperCase() === "HIGH"
                    ? "enq-priority-high"
                    : data.Winprob?.toUpperCase() === "MEDIUM"
                      ? "enq-priority-medium"
                      : "enq-priority-low"
                }
              />
              <Field
                label="Priority"
                value={fmt(data.Priority)}
                highlight={priorityClass(data.Priority)}
              />

              {/* Project Name full width */}
              <div className="enq-view-field" style={{ gridColumn: "1 / -1" }}>
                <span className="enq-view-label">Project Name</span>
                <span className="enq-view-value">{fmt(data.Projectname)}</span>
              </div>
            </div>

            {/* Products image panel */}
            <div className="enq-product-imgpanel">
              <div className="enq-imgpanel-title">
                <i className="bi bi-images me-2"></i>Products
              </div>
              {products.length === 0 ? (
                <div className="enq-imgpanel-empty">
                  <i
                    className="bi bi-box-seam"
                    style={{ fontSize: "2rem", color: "#ccc" }}
                  ></i>
                  <p className="mb-0" style={{ fontSize: "0.78rem" }}>
                    No products
                  </p>
                </div>
              ) : (
                <div className="enq-imgpanel-cards">
                  {products.map((prod) => (
                    <div key={prod} className="enq-imgpanel-card">
                      <div className="enq-imgpanel-placeholder">
                        <i
                          className="bi bi-image text-muted"
                          style={{ fontSize: "1.4rem" }}
                        ></i>
                      </div>
                      <div className="enq-imgpanel-prodname">{prod}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
             SECTION 4 — QUOTE
        ══════════════════════════════════════ */}
        <div className="enq-view-card">
          <div className="enq-view-section-title">
            <i className="bi bi-journal-bookmark me-2"></i>4. Quote Details
          </div>
          <div className="enq-view-grid">
            <Field
              label="Quote Number"
              value={fmt(data.Quotenumber)}
              highlight="enq-qno-highlight"
            />
            <Field label="Revision" value={fmt(String(data.Rev ?? 0))} />
            <Field label="Register Date" value={fmtDate(data.RFQREGDate)} />
            <Field
              label="Stage"
              value={
                <span
                  className={`enq-stage-badge ${stageBadgeClass(data.Quotestage)}`}
                >
                  {data.Quotestage || "—"}
                </span>
              }
            />
            <Field
              label="Opportunity Stage"
              value={fmt(data.Opportunitystage)}
            />
            <Field
              label="Quote Submitted Date"
              value={fmtDate(data.Quotesubmitteddate)}
            />
            <Field
              label="Expected Order Date"
              value={fmtDate(data.Expectedorderdate)}
            />
            <Field label="Eff. Enquiry Date" value={fmtDate(data.EffEnqDate)} />
            <Field label="Revised Date" value={fmtDate(data.RevisedDate)} />
          </div>

          {/* Reason — only if Regret / Cancelled */}
          {["REGRET", "CANCELLED"].includes(data.Quotestage?.toUpperCase()) && (
            <div className="enq-reason-card mt-3">
              <div className="enq-view-label mb-1">
                <i className="bi bi-exclamation-triangle-fill me-1 text-danger"></i>
                Reason ({data.Quotestage})
              </div>
              <div className="enq-view-value">{fmt(data.Reason)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
           QUOTE GENERATION CONFIRM MODAL
      ══════════════════════════════════════ */}
      {showQuoteModal && (
        <div className="enq-modal-backdrop">
          <div className="enq-modal">
            <h6>
              <i className="bi bi-lightning-charge-fill me-2"></i>
              Generate Quote
            </h6>
            <p style={{ fontSize: "0.85rem", color: "#444" }}>
              You are about to generate a quote for:
            </p>
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #f5c6cb",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: "0.84rem",
              }}
            >
              <div>
                <strong>Quote No:</strong>{" "}
                <span style={{ color: "#800000", fontWeight: 700 }}>
                  {data.Quotenumber}
                </span>
              </div>
              <div>
                <strong>Project:</strong> {data.Projectname || "—"}
              </div>
              <div>
                <strong>Customer:</strong> {data.Customername || "—"}
              </div>
              <div>
                <strong>Stage:</strong> {data.Quotestage || "—"}
              </div>
            </div>

            {/* Alert inside modal */}
            {quoteAlert.msg && (
              <div
                className={`alert alert-${quoteAlert.type} py-2 mb-3`}
                style={{ fontSize: "0.82rem" }}
              >
                {quoteAlert.msg}
              </div>
            )}

            <div className="d-flex gap-2 justify-content-end">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowQuoteModal(false)}
                disabled={generating}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm enq-btn-submit"
                onClick={handleGenerateQuote}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle-fill me-1"></i>
                    Confirm & Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
