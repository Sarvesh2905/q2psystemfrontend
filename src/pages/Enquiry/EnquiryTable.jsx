import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";
const ROWS_PER_PAGE = 15;

function fmtDate(val) {
  if (!val) return "";
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

export default function EnquiryTable() {
  const navigate = useNavigate();
  const getHeaders = () => ({ Authorization: `Bearer ${getAuth()}` });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [probFilter, setProbFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    axios
      .get(`${API}/api/enquiry`, { headers: getHeaders() })
      .then((r) => {
        setRows(r.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load enquiries.");
        setLoading(false);
      });
  }, []); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.Quotenumber?.toLowerCase().includes(q) ||
        r.Customername?.toLowerCase().includes(q) ||
        r.Projectname?.toLowerCase().includes(q) ||
        r.Product?.toLowerCase().includes(q) ||
        r.Deptuser?.toLowerCase().includes(q) ||
        r.Endusername?.toLowerCase().includes(q);
      const matchStage =
        !stageFilter ||
        r.Quotestage?.toLowerCase() === stageFilter.toLowerCase();
      const matchProb =
        !probFilter || r.Winprob?.toUpperCase() === probFilter.toUpperCase();
      return matchSearch && matchStage && matchProb;
    });
  }, [rows, search, stageFilter, probFilter]);

  useEffect(() => setPage(1), [search, stageFilter, probFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );
  const allStages = useMemo(
    () => [...new Set(rows.map((r) => r.Quotestage).filter(Boolean))].sort(),
    [rows],
  );

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-3 py-3">
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/enquiry")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <h5 className="master-page-title mb-0">
            <i className="bi bi-clipboard2-data-fill me-2" />
            Enquiry Register
          </h5>
          <div className="ms-auto">
            <span className="text-muted me-3" style={{ fontSize: "0.8rem" }}>
              Records: <strong>{filtered.length}</strong>
            </span>
            <button
              className="btn btn-sm enq-btn-submit"
              onClick={() => navigate("/enquiry/add")}
            >
              <i className="bi bi-plus-circle-fill me-1" />
              Add Enquiry
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="enq-table-toolbar">
          <div style={{ flex: "1 1 220px", minWidth: 180 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search quote no, customer, project, product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch("")}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: "0 0 170px" }}>
            <select
              className="form-select form-select-sm"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              {allStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 0 140px" }}>
            <select
              className="form-select form-select-sm"
              value={probFilter}
              onChange={(e) => setProbFilter(e.target.value)}
            >
              <option value="">All Probability</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          {(search || stageFilter || probFilter) && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSearch("");
                setStageFilter("");
                setProbFilter("");
              }}
            >
              <i className="bi bi-x-circle me-1" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="enq-loading mt-4">
            <span className="spinner-border spinner-border-sm me-2" />
            Loading enquiries...
          </div>
        ) : error ? (
          <div className="enq-error-msg mt-3">{error}</div>
        ) : (
          <div className="enq-table-wrapper">
            <table className="enq-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>App. Engineer</th>
                  <th>Sales Contact</th>
                  <th>Quote Number</th>
                  <th>Quote Date</th>
                  <th>Customer</th>
                  <th>End User</th>
                  <th>Product</th>
                  <th>Project</th>
                  <th>Cust. Due Date</th>
                  <th>Probability</th>
                  <th>Quote Stage</th>
                  <th>Category</th>
                  <th>Opp. Stage</th>
                  <th>Rev</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={16}
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: "#aaa",
                      }}
                    >
                      <i
                        className="bi bi-inbox"
                        style={{
                          fontSize: "2rem",
                          display: "block",
                          marginBottom: 8,
                        }}
                      />
                      No enquiries found
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, idx) => (
                    <tr key={r.Quotenumber}>
                      <td style={{ color: "#aaa", fontSize: "0.75rem" }}>
                        {(page - 1) * ROWS_PER_PAGE + idx + 1}
                      </td>
                      <td style={{ fontSize: "0.79rem" }}>{r.Deptuser}</td>
                      <td style={{ fontSize: "0.79rem" }}>{r.Salescontact}</td>
                      <td>
                        <span
                          style={{
                            color: "#800000",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.82rem",
                          }}
                          onClick={() =>
                            navigate(
                              `/enquiry/view/${encodeURIComponent(r.Quotenumber)}`,
                            )
                          }
                        >
                          {r.Quotenumber}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.79rem" }}>
                        {fmtDate(r.RFQREGDate)}
                      </td>
                      <td style={{ fontSize: "0.79rem", maxWidth: 140 }}>
                        {r.Customername}
                      </td>
                      <td style={{ fontSize: "0.79rem", maxWidth: 120 }}>
                        {r.Endusername || "TBA"}
                      </td>
                      <td style={{ fontSize: "0.77rem", maxWidth: 140 }}>
                        {r.Product}
                      </td>
                      <td
                        style={{
                          fontSize: "0.77rem",
                          maxWidth: 140,
                          color: "#555",
                        }}
                      >
                        {r.Projectname}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.79rem" }}>
                        {fmtDate(r.CustomerdueDate)}
                      </td>
                      <td>
                        <span
                          className={probClass(r.Winprob)}
                          style={{ fontSize: "0.79rem" }}
                        >
                          {r.Winprob}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`enq-stage-badge ${stageBadgeClass(r.Quotestage)}`}
                        >
                          {r.Quotestage}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.77rem" }}>{r.RFQCategory}</td>
                      <td style={{ fontSize: "0.77rem", color: "#555" }}>
                        {r.Opportunitystage}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "0.79rem" }}>
                        {r.Rev ?? 0}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          className="enq-action-btn"
                          title="View Enquiry"
                          onClick={() =>
                            navigate(
                              `/enquiry/view/${encodeURIComponent(r.Quotenumber)}`,
                            )
                          }
                        >
                          <i
                            className="bi bi-eye-fill"
                            style={{ color: "#1a4f8a" }}
                          />
                        </button>
                        <button
                          className="enq-action-btn"
                          title="Edit Enquiry"
                          onClick={() =>
                            navigate(
                              `/enquiry/edit/${encodeURIComponent(r.Quotenumber)}`,
                            )
                          }
                        >
                          <i
                            className="bi bi-pencil-fill"
                            style={{ color: "#800000" }}
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="enq-pagination">
            <span className="text-muted me-2" style={{ fontSize: "0.78rem" }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="enq-page-btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <i className="bi bi-chevron-double-left" />
            </button>
            <button
              className="enq-page-btn"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <i className="bi bi-chevron-left" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
              )
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dots-${i}`}
                    style={{
                      padding: "0 4px",
                      color: "#aaa",
                      fontSize: "0.78rem",
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`enq-page-btn${page === p ? " active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              className="enq-page-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              <i className="bi bi-chevron-right" />
            </button>
            <button
              className="enq-page-btn"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <i className="bi bi-chevron-double-right" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
