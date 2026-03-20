import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/end-industry";
const PAGE_SIZE = 50;

const emptyForm = { Industry: "", Description: "" };

export default function EndIndustry() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchInd, setSearchInd] = useState("");
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editSno, setEditSno] = useState(null);
  const [editIndustry, setEditIndustry] = useState("");
  const [dupError, setDupError] = useState("");
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(API, { headers });
      setAllData(data);
      setFiltered(data);
      setPage(1);
    } catch {
      showAlert("Failed to load data.", "danger");
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  // ── Live Search ───────────────────────────────────────────────────────────
  const handleLiveSearch = (e) => {
    const val = e.target.value;
    setSearchInd(val);
    const q = val.trim().toLowerCase();
    setFiltered(
      !q
        ? allData
        : allData.filter((row) =>
            [row.Industry, row.Description]
              .map((v) => (v || "").toLowerCase())
              .some((v) => v.includes(q)),
          ),
    );
    setPage(1);
  };

  const handleClear = () => {
    setSearchInd("");
    setFiltered(allData);
    setPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Open Add Panel ────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  // ── Open Edit Panel on double-click ──────────────────────────────────────
  const openEdit = (row) => {
    setEditSno(row.Sno);
    setEditIndustry(row.Industry);
    setForm({ Industry: row.Industry, Description: row.Description || "" });
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setDupError("");
  };

  // ── Duplicate check fires on Industry onBlur ──────────────────────────────
  const checkDuplicate = async (val) => {
    if (!val.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check?ind=${encodeURIComponent(val)}`,
        { headers },
      );
      if (data.exists) setDupError(data.message);
      else setDupError("");
    } catch {}
  };

  // ── ADD ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (dupError) return;
    setLoading(true);
    try {
      const { data } = await axios.post(API, form, { headers });
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error adding End Industry.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── EDIT — only Description submitted ────────────────────────────────────
  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${API}/${editSno}`,
        { Description: form.Description },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating End Industry.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  const lockedStyle = { backgroundColor: "#e9ecef" };

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-3 py-3">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/masters")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Masters &rsaquo; <strong>End Industry</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-building me-2"></i>End Industry Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* ── Live Search Toolbar ───────────────────────────────────── */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Industry
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "220px" }}
              placeholder="Search by Industry..."
              value={searchInd}
              onChange={handleLiveSearch}
            />
          </div>
          {searchInd && (
            <button
              className="btn btn-sm btn-outline-secondary align-self-end"
              onClick={handleClear}
            >
              <i className="bi bi-x-circle me-1"></i>Clear
            </button>
          )}
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: "0.82rem" }}>
              Records: <strong>{filtered.length}</strong>
            </span>
            {canEdit && (
              <button
                className="btn btn-sm btn-primary-custom"
                onClick={openAdd}
              >
                <i className="bi bi-plus-circle-fill me-1"></i>Add
              </button>
            )}
          </div>
        </div>

        {/* ── Table + Panel ────────────────────────────────────────── */}
        <div className="d-flex gap-3" style={{ minHeight: "60vh" }}>
          {/* Table */}
          <div
            className="master-table-wrapper"
            style={{
              flex: panel ? "0 0 57%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "6%" }}>S.No</th>
                  <th style={{ width: "30%" }}>Industry</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row, idx) => (
                    <tr
                      key={row.Sno}
                      onDoubleClick={() => canEdit && openEdit(row)}
                      style={{ cursor: canEdit ? "pointer" : "default" }}
                      className={
                        panel === "edit" && editSno === row.Sno
                          ? "table-active"
                          : ""
                      }
                    >
                      <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "#800000",
                            color: "#fff",
                            fontSize: "0.78rem",
                          }}
                        >
                          {row.Industry}
                        </span>
                      </td>
                      <td
                        className="text-muted"
                        style={{ fontSize: "0.85rem" }}
                      >
                        {row.Description || <em>—</em>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                <small className="text-muted">
                  Page {page} of {totalPages}
                </small>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 || p === totalPages || Math.abs(p - page) <= 2,
                    )
                    .map((p, i, arr) => (
                      <>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <span key={`e${p}`} className="btn btn-sm disabled">
                            …
                          </span>
                        )}
                        <button
                          key={p}
                          className={`btn btn-sm ${page === p ? "btn-primary-custom" : "btn-outline-secondary"}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </>
                    ))}
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Side Panel ───────────────────────────────────────── */}
          {panel && (
            <div className="master-side-panel" style={{ flex: "0 0 41%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"} me-2`}
                  ></i>
                  {panel === "add"
                    ? "Create End Industry"
                    : "Modify End Industry"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {dupError && (
                <div
                  className="alert alert-danger py-1 mb-3"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  {dupError}
                </div>
              )}

              <form
                onSubmit={panel === "add" ? handleAdd : handleEdit}
                noValidate
              >
                {/* INDUSTRY — auto-uppercase, locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Industry{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${dupError ? "is-invalid" : ""}`}
                        value={form.Industry}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            Industry: e.target.value.toUpperCase(),
                          }));
                          setDupError("");
                        }}
                        onBlur={(e) => checkDuplicate(e.target.value)}
                        required
                        placeholder="e.g. POWER GENERATION"
                        maxLength={45}
                      />
                      <small
                        className="text-muted"
                        style={{ fontSize: "0.74rem" }}
                      >
                        Auto-converted to UPPERCASE
                      </small>
                    </>
                  ) : (
                    <input
                      className="form-control form-control-sm"
                      value={editIndustry}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* DESCRIPTION — editable in both add and edit */}
                <div className="mb-4">
                  <label className="form-label panel-label">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    value={form.Description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        Description: e.target.value,
                      }))
                    }
                    placeholder="Enter description (optional)"
                    maxLength={75}
                  />
                  <small className="text-muted" style={{ fontSize: "0.74rem" }}>
                    Max 75 characters
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={loading || !!dupError}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i
                        className={`bi ${panel === "add" ? "bi-check-circle" : "bi-pencil-square"} me-1`}
                      ></i>
                    )}
                    {panel === "add" ? "Save" : "Update"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary flex-fill"
                    onClick={closePanel}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
