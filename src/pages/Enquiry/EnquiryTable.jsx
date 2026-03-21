import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";
const ROWS_PER_PAGE = 10;

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return "—";
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
  if (s === "technical offer") return "enq-stage-enquiry";
  if (s === "priced offer") return "enq-stage-quoted";
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

export default function EnquiryTable() {
  const navigate = useNavigate();
  const { token } = getAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── filters ── */
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priFilter, setPriFilter] = useState("");

  /* ── pagination ── */
  const [page, setPage] = useState(1);

  /* ════════════════════════════════════════
     FETCH ALL ENQUIRIES
  ════════════════════════════════════════ */
  useEffect(() => {
    axios
      .get(`${API}/api/enquiry/`, { headers })
      .then((r) => {
        setRows(r.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load enquiries.");
        setLoading(false);
      });
  }, []); // eslint-disable-line

  /* ════════════════════════════════════════
     FILTERED + SORTED ROWS
  ════════════════════════════════════════ */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        (r.Quotenumber || "").toLowerCase().includes(q) ||
        (r.Customername || "").toLowerCase().includes(q) ||
        (r.Projectname || "").toLowerCase().includes(q) ||
        (r.Deptuser || "").toLowerCase().includes(q) ||
        (r.Salescontact || "").toLowerCase().includes(q) ||
        (r.Product || "").toLowerCase().includes(q);

      const matchStage =
        !stageFilter ||
        (r.Quotestage || "").toLowerCase() === stageFilter.toLowerCase();

      const matchPri =
        !priFilter ||
        (r.Priority || "").toLowerCase() === priFilter.toLowerCase();

      return matchSearch && matchStage && matchPri;
    });
  }, [rows, search, stageFilter, priFilter]);

  /* reset page on filter change */
  useEffect(() => setPage(1), [search, stageFilter, priFilter]);

  /* ── pagination slice ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  /* ── unique stages for filter dropdown ── */
  const allStages = useMemo(() => {
    const s = new Set(rows.map((r) => r.Quotestage).filter(Boolean));
    return [...s].sort();
  }, [rows]);

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
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
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <h5 className="master-page-title mb-0">
            <i className="bi bi-clipboard2-data-fill me-2"></i>Enquiry Register
          </h5>
          <div className="ms-auto">
            <button
              className="btn btn-sm enq-btn-submit"
              onClick={() => navigate("/enquiry/add")}
            >
              <i className="bi bi-plus-circle-fill me-1"></i>Add Enquiry
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="enq-table-toolbar">
          {/* Search */}
          <div style={{ flex: "1 1 220px", minWidth: 180 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
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
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>

          {/* Stage Filter */}
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

          {/* Priority Filter */}
          <div style={{ flex: "0 0 140px" }}>
            <select
              className="form-select form-select-sm"
              value={priFilter}
              onChange={(e) => setPriFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Record count */}
          <div
            className="text-muted ms-auto"
            style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}
          >
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </div>

          {/* Clear filters */}
          {(search || stageFilter || priFilter) && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSearch("");
                setStageFilter("");
                setPriFilter("");
              }}
            >
              <i className="bi bi-x-circle me-1"></i>Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="enq-loading">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Loading enquiries...
          </div>
        ) : error ? (
          <div className="enq-error-msg">{error}</div>
        ) : (
          <div className="enq-table-wrapper">
            <table className="enq-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Quote No</th>
                  <th>Rev</th>
                  <th>Reg. Date</th>
                  <th>Customer</th>
                  <th>Project</th>
                  <th>Products</th>
                  <th>App. Eng.</th>
                  <th>Sales</th>
                  <th>RFQ Date</th>
                  <th>Stage</th>
                  <th>Opp. Stage</th>
                  <th>Priority</th>
                  <th>Win Prob</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      style={{
                        textAlign: "center",
                        padding: "32px",
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
                      ></i>
                      No enquiries found
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, idx) => (
                    <tr key={r.Quotenumber}>
                      {/* # */}
                      <td style={{ color: "#aaa", fontSize: "0.75rem" }}>
                        {(page - 1) * ROWS_PER_PAGE + idx + 1}
                      </td>

                      {/* Quote No */}
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
                          title="View Enquiry"
                        >
                          {r.Quotenumber}
                        </span>
                      </td>

                      {/* Rev */}
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            background: "#f0f0f0",
                            borderRadius: 4,
                            padding: "1px 7px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {r.Rev ?? 0}
                        </span>
                      </td>

                      {/* Reg Date */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(r.RFQREGDate)}
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                          {r.Customername || "—"}
                        </div>
                        {r.CustomerCountry && (
                          <div style={{ fontSize: "0.72rem", color: "#888" }}>
                            {r.CustomerCountry}
                          </div>
                        )}
                      </td>

                      {/* Project */}
                      <td
                        style={{
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.8rem",
                        }}
                        title={r.Projectname}
                      >
                        {r.Projectname || "—"}
                      </td>

                      {/* Products */}
                      <td style={{ maxWidth: 130 }}>
                        {r.Product ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 3,
                            }}
                          >
                            {r.Product.split(",")
                              .map((p) => p.trim())
                              .filter(Boolean)
                              .map((p) => (
                                <span
                                  key={p}
                                  style={{
                                    background: "rgba(128,0,0,0.08)",
                                    color: "#800000",
                                    borderRadius: 4,
                                    padding: "1px 6px",
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {p}
                                </span>
                              ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* App Eng */}
                      <td style={{ fontSize: "0.79rem" }}>
                        {r.Deptuser || "—"}
                      </td>

                      {/* Sales */}
                      <td style={{ fontSize: "0.79rem" }}>
                        {r.Salescontact || "—"}
                      </td>

                      {/* RFQ Date */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(r.RFQDate)}
                      </td>

                      {/* Stage */}
                      <td>
                        <span
                          className={`enq-stage-badge ${stageBadgeClass(r.Quotestage)}`}
                        >
                          {r.Quotestage || "—"}
                        </span>
                      </td>

                      {/* Opp Stage */}
                      <td style={{ fontSize: "0.77rem", color: "#555" }}>
                        {r.Opportunitystage || "—"}
                      </td>

                      {/* Priority */}
                      <td>
                        <span
                          className={priorityClass(r.Priority)}
                          style={{ fontSize: "0.79rem" }}
                        >
                          {r.Priority || "—"}
                        </span>
                      </td>

                      {/* Win Prob */}
                      <td>
                        <span
                          className={priorityClass(r.Winprob)}
                          style={{ fontSize: "0.79rem" }}
                        >
                          {r.Winprob || "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        {/* View */}
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
                          ></i>
                        </button>

                        {/* Edit */}
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
                          ></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="enq-pagination">
                <span
                  className="text-muted me-2"
                  style={{ fontSize: "0.78rem" }}
                >
                  Page {page} of {totalPages}
                </span>

                {/* First */}
                <button
                  className="enq-page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>

                {/* Prev */}
                <button
                  className="enq-page-btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 2,
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
                        className={`enq-page-btn ${page === p ? "active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}

                {/* Next */}
                <button
                  className="enq-page-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>

                {/* Last */}
                <button
                  className="enq-page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
