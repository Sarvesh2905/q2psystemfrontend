import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";

function fmt(val) {
  return val || "—";
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
  if (["quoted", "priced offer", "technical offer"].includes(s))
    return "enq-stage-quoted";
  if (s === "won") return "enq-stage-won";
  if (s === "regret") return "enq-stage-regret";
  if (s === "cancelled") return "enq-stage-cancelled";
  return "enq-stage-default";
}
function probClass(p) {
  if (!p) return "";
  const v = p.toUpperCase();
  if (v === "HIGH") return "enq-priority-high";
  if (v === "MEDIUM") return "enq-priority-medium";
  return "enq-priority-low";
}

function Field({ label, value, highlight, fullWidth }) {
  return (
    <div
      className="enq-view-field"
      style={fullWidth ? { gridColumn: "1/-1" } : {}}
    >
      <span className="enq-view-label">{label}</span>
      <span
        className={`enq-view-value ${!value || value === "—" ? "empty" : ""} ${highlight || ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function ViewEnquiry() {
  const { quotenumber } = useParams();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${getAuth()}` };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quoteAlert, setQuoteAlert] = useState({ msg: "", type: "" });

  const showQAlert = (msg, type) => {
    setQuoteAlert({ msg, type });
    setTimeout(() => setQuoteAlert({ msg: "", type: "" }), 4500);
  };

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

  const handleGenerateQuote = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/api/enquiry/generate-quote`,
        { quotenumber },
        { headers },
      );
      showQAlert(
        `Quote generated! Quote No: ${res.data.quoteNumber || quotenumber}`,
        "success",
      );
      setTimeout(() => {
        setShowQuoteModal(false);
        navigate("/enquiry/register");
      }, 2000);
    } catch (err) {
      showQAlert(
        err.response?.data?.message || "Failed to generate quote.",
        "danger",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading)
    return (
      <>
        <DashboardNavbar />
        <div className="enq-loading mt-5 ms-4">
          <span className="spinner-border spinner-border-sm me-2" />
          Loading enquiry...
        </div>
      </>
    );

  if (error || !data)
    return (
      <>
        <DashboardNavbar />
        <div className="enq-error-msg mt-4 mx-3">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error || "Enquiry not found."}
        </div>
      </>
    );

  const products = data.Product
    ? data.Product.split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const canGenerateQuote = !["CANCELLED", "REGRET"].includes(
    data.Quotestage?.toUpperCase(),
  );

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-3 py-3">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/enquiry/register")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Enquiry &rsaquo; Register &rsaquo;{" "}
            <strong>{data.Quotenumber}</strong>
          </span>
        </div>

        {/* Title row */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div>
            <h5 className="master-page-title mb-1">
              <i className="bi bi-eye-fill me-2" />
              View Enquiry
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: "0.82rem" }}>
              Quote No{" "}
              <strong style={{ color: "#800000" }}>{data.Quotenumber}</strong>
              &nbsp;&nbsp;Rev <strong>{data.Rev ?? 0}</strong>
              &nbsp;&nbsp;Stage&nbsp;
              <span
                className={`enq-stage-badge ${stageBadgeClass(data.Quotestage)}`}
              >
                {data.Quotestage}
              </span>
            </p>
          </div>
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
            <i className="bi bi-pencil-fill me-1" />
            Edit Enquiry
          </button>
        </div>

        {/* Quote Generation Banner */}
        {canGenerateQuote && (
          <div className="enq-quote-banner mb-3">
            <div>
              <div className="enq-quote-banner-title">
                <i className="bi bi-file-earmark-check-fill me-2" />
                Ready to Generate Quote?
              </div>
              <div className="enq-quote-banner-sub">
                Enquiry <strong>{data.Quotenumber}</strong> —{" "}
                {data.Projectname || "No project name"}
              </div>
            </div>
            <button
              className="btn enq-btn-generate-quote"
              onClick={() => setShowQuoteModal(true)}
            >
              <i className="bi bi-lightning-charge-fill me-1" />
              Generate Quote
            </button>
          </div>
        )}

        {/* 4-section grid matching Add layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 230px",
            gap: 16,
            marginBottom: 16,
            alignItems: "start",
          }}
        >
          {/* 1. Customer */}
          <div className="enq-view-card">
            <div className="enq-view-section-title">
              <i className="bi bi-building me-2" />
              1. Customer
            </div>
            <div className="enq-view-grid">
              <Field
                label="Customer Name"
                value={fmt(data.Customername)}
                highlight="enq-qno-highlight"
              />
              <Field label="Customer Category" value={fmt(data.Customertype)} />
              <Field
                label="Customer Country"
                value={fmt(data.CustomerCountry)}
              />
              <Field label="Buyer Name" value={fmt(data.Buyername)} />
              <Field label="Group" value={fmt(data.Groupname)} />
              <Field label="Currency" value={fmt(data.Currency)} />
              <Field label="End User Name" value={fmt(data.Endusername)} />
              <Field label="End User Country" value={fmt(data.EndCountry)} />
              <Field label="End Industry" value={fmt(data.EndIndustry)} />
            </div>
          </div>

          {/* 2. RFQ */}
          <div className="enq-view-card">
            <div className="enq-view-section-title">
              <i className="bi bi-file-earmark-text me-2" />
              2. RFQ
            </div>
            <div className="enq-view-grid">
              <Field label="RFQ Receipt Date" value={fmtDate(data.RFQDate)} />
              <Field label="App. Engineer Name" value={fmt(data.Deptuser)} />
              <Field label="Sales Contact" value={fmt(data.Salescontact)} />
              <Field label="Opportunity Type" value={fmt(data.RFQType)} />
              <Field label="Category" value={fmt(data.RFQCategory)} />
            </div>
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
                {data.RFQreference || <span className="empty">—</span>}
              </div>
            </div>
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

          {/* Image Panel */}
          <div className="enq-imgpanel-outer" style={{ minHeight: 280 }}>
            <div className="enq-imgpanel-logo">
              <div
                style={{
                  color: "#800000",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  letterSpacing: 2,
                }}
              >
                CIRCOR
              </div>
              <div style={{ color: "#aaa", fontSize: "0.75rem" }}>
                Product Preview
              </div>
            </div>
            {products.length === 0 ? (
              <div className="enq-imgpanel-empty mt-3">
                <i
                  className="bi bi-box-seam"
                  style={{ fontSize: "2rem", color: "#ddd" }}
                />
                <p style={{ fontSize: "0.76rem", color: "#bbb", margin: 0 }}>
                  No products
                </p>
              </div>
            ) : (
              <div className="enq-imgpanel-cards">
                {products.map((p) => (
                  <div key={p} className="enq-imgpanel-card">
                    <div className="enq-imgpanel-placeholder">
                      <i
                        className="bi bi-image text-muted"
                        style={{ fontSize: "1.2rem" }}
                      />
                    </div>
                    <div className="enq-imgpanel-prodname">{p}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Quote + Product */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* 4. Quote */}
          <div className="enq-view-card">
            <div className="enq-view-section-title">
              <i className="bi bi-journal-bookmark me-2" />
              4. Quote
            </div>
            <div className="enq-view-grid">
              <Field
                label="Quote Number"
                value={fmt(data.Quotenumber)}
                highlight="enq-qno-highlight"
              />
              <Field label="Register Date" value={fmtDate(data.RFQREGDate)} />
              <Field label="Stage" value={fmt(data.Quotestage)} />
              <Field
                label="Quote Submitted Date"
                value={fmtDate(data.Quotesubmitteddate)}
              />
              <Field
                label="Opportunity Stage"
                value={fmt(data.Opportunitystage)}
              />
              <Field label="Revision" value={String(data.Rev ?? 0)} />
              <Field
                label="Expected Order Date"
                value={fmtDate(data.Expectedorderdate)}
              />
              <Field
                label="Effective Enquiry Date"
                value={fmtDate(data.EffEnqDate)}
              />
              <Field
                label="Priority"
                value={fmt(data.Priority)}
                highlight={probClass(data.Priority)}
              />
            </div>
          </div>

          {/* 3. Product */}
          <div className="enq-view-card">
            <div className="enq-view-section-title">
              <i className="bi bi-box-seam me-2" />
              3. Product
            </div>
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
                label="Winning Probability"
                value={fmt(data.Winprob)}
                highlight={probClass(data.Winprob)}
              />
            </div>
            {/* Products as tags */}
            <div className="mt-3">
              <div className="enq-view-label">Products Selected</div>
              <div className="mt-1 d-flex flex-wrap gap-1">
                {products.length === 0 ? (
                  <span className="enq-view-value empty">—</span>
                ) : (
                  products.map((p) => (
                    <span
                      key={p}
                      style={{
                        background: "rgba(128,0,0,0.08)",
                        color: "#800000",
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      {p}
                    </span>
                  ))
                )}
              </div>
            </div>
            {/* Project name */}
            <div className="mt-3">
              <div className="enq-view-label">Project Name</div>
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
                {data.Projectname || <span className="empty">—</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Generation Modal */}
      {showQuoteModal && (
        <div
          className="enq-modal-backdrop"
          onClick={() => !generating && setShowQuoteModal(false)}
        >
          <div className="enq-modal" onClick={(e) => e.stopPropagation()}>
            <h6>
              <i className="bi bi-lightning-charge-fill me-2" />
              Generate Quote
            </h6>
            <p style={{ fontSize: "0.85rem", color: "#444" }}>
              This will mark enquiry <strong>{data.Quotenumber}</strong> as
              quote-generated and move it to the quote pipeline.
            </p>
            {quoteAlert.msg && (
              <div
                className={`alert alert-${quoteAlert.type} py-2 mb-2`}
                style={{ fontSize: "0.82rem" }}
              >
                {quoteAlert.msg}
              </div>
            )}
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowQuoteModal(false)}
                disabled={generating}
              >
                Cancel
              </button>
              <button
                className="btn enq-btn-submit btn-sm"
                onClick={handleGenerateQuote}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle-fill me-1" />
                    Confirm
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
