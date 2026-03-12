import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/gereference";
const PAGE_SIZE = 50;

const emptyForm = { Customerpartno: "", Cftipartno: "" };

export default function GEReference() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editSno, setEditSno] = useState(null);
  const [editCfti, setEditCfti] = useState("");
  const [cftiOptions, setCftiOptions] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    sno: null,
    currentStatus: "",
    label: "",
  });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // ── Load CFTI dropdown ────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API}/cftiparts`, { headers })
      .then((r) => setCftiOptions(r.data))
      .catch(() => {});
  }, [token]);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(API, { headers });
      setAllData(data);
      applyFilter(data, searchText);
    } catch {
      showAlert("Failed to load data.", "danger");
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4000);
  };

  // ── Search — single text filter across Customerpartno + Cftipartno ────────
  const applyFilter = (data, text) => {
    const t = text.trim().toLowerCase();
    const result = t
      ? data.filter(
          (row) =>
            (row.Customerpartno || "").toLowerCase().includes(t) ||
            (row.Cftipartno || "").toLowerCase().includes(t),
        )
      : data;
    setFiltered(result);
    setPage(1);
  };

  const handleSearch = () => applyFilter(allData, searchText);
  const handleClear = () => {
    setSearchText("");
    applyFilter(allData, "");
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Panels ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const openEdit = (row) => {
    if (row.status === "Inactive") {
      showAlert("This reference is Inactive and cannot be edited.", "warning");
      return;
    }
    setForm({ Customerpartno: row.Customerpartno, Cftipartno: row.Cftipartno });
    setEditSno(row.Sno);
    setEditCfti(row.Cftipartno); // keep locked value
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setFieldErrors({});
  };

  // ── Duplicate check (combination) ────────────────────────────────────────
  const checkDuplicate = async (custpartno, cftipartno) => {
    if (!custpartno || !cftipartno) return;
    try {
      const { data } = await axios.get(
        `${API}/check?custpartno=${encodeURIComponent(custpartno)}&cftipartno=${encodeURIComponent(cftipartno)}`,
        { headers },
      );
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, combo: data.message }));
      else
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e.combo;
          return e;
        });
    } catch {}
  };

  const clearErr = () =>
    setFieldErrors((prev) => {
      const e = { ...prev };
      delete e.combo;
      return e;
    });

  // ── ADD ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (Object.keys(fieldErrors).length > 0) return;
    setLoading(true);
    try {
      const { data } = await axios.post(API, form, { headers });
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error adding reference.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const handleEdit = async (e) => {
    e.preventDefault();
    if (Object.keys(fieldErrors).length > 0) return;
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${API}/${editSno}`,
        { Customerpartno: form.Customerpartno, Cftipartno: editCfti },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating reference.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── TOGGLE ────────────────────────────────────────────────────────────────
  const handleToggle = async () => {
    const { sno, currentStatus } = confirmModal;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setConfirmModal({ show: false, sno: null, currentStatus: "", label: "" });
    try {
      const { data } = await axios.patch(
        `${API}/toggle/${sno}`,
        { status: newStatus },
        { headers },
      );
      if (data.openquote) {
        showAlert(data.message, "warning");
      } else {
        fetchData();
      }
    } catch {
      showAlert("Failed to toggle status.", "danger");
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
            Masters &rsaquo; <strong>GE Reference</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-link-45deg me-2"></i>GE Reference Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* ── Toolbar ──────────────────────────────────────────────── */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-end gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search (Customer PN / CFTI PN)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "260px" }}
              placeholder="Filter by Customer PN or CFTI Part No..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="d-flex gap-2 align-items-end">
            <button
              className="btn btn-sm btn-primary-custom"
              onClick={handleSearch}
            >
              <i className="bi bi-search me-1"></i>Search
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={handleClear}
            >
              <i className="bi bi-x-circle me-1"></i>Clear
            </button>
          </div>
          <div className="ms-auto d-flex align-items-end gap-2">
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
                  <th style={{ width: "38%" }}>Customer Part No. (GE PN)</th>
                  <th style={{ width: "38%" }}>CFTI Part No.</th>
                  <th style={{ width: "18%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
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
                        <i className="bi bi-person-badge me-1 text-muted"></i>
                        <strong>{row.Customerpartno}</strong>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "#800000",
                            color: "#fff",
                            fontSize: "0.8rem",
                          }}
                        >
                          {row.Cftipartno}
                        </span>
                      </td>
                      <td className="text-center">
                        {canEdit ? (
                          <button
                            className={`btn btn-xs status-btn ${row.status === "Active" ? "status-active" : "status-inactive"}`}
                            onClick={() =>
                              setConfirmModal({
                                show: true,
                                sno: row.Sno,
                                currentStatus: row.status,
                                label: `${row.Customerpartno} / ${row.Cftipartno}`,
                              })
                            }
                          >
                            {row.status}
                          </button>
                        ) : (
                          <span
                            className={`badge ${row.status === "Active" ? "bg-success" : "bg-secondary"}`}
                          >
                            {row.status}
                          </span>
                        )}
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
                    ? "Create GE Reference"
                    : "Modify GE Reference"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form
                onSubmit={panel === "add" ? handleAdd : handleEdit}
                noValidate
              >
                {/* CFTI Part No — dropdown on add, LOCKED in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    CFTI Part No.{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Cftipartno}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({ ...prev, Cftipartno: val }));
                        clearErr();
                        if (form.Customerpartno && val)
                          checkDuplicate(form.Customerpartno, val);
                      }}
                      required
                    >
                      <option value="">-- Select CFTI Part No. --</option>
                      {cftiOptions.map((p, i) => (
                        <option key={i} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editCfti}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* Customer Part No (GE PN) — editable in both add & edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Customer Part No. (GE PN){" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.combo ? "is-invalid" : ""}`}
                    value={form.Customerpartno}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setForm((prev) => ({ ...prev, Customerpartno: val }));
                      clearErr();
                      // live duplicate check (same as original — fires on cftipartno change)
                      const cfti = panel === "add" ? form.Cftipartno : editCfti;
                      if (val && cfti) checkDuplicate(val, cfti);
                    }}
                    required
                    maxLength={36}
                    placeholder="e.g. GE-12345"
                  />
                  {fieldErrors.combo && (
                    <div className="invalid-feedback">{fieldErrors.combo}</div>
                  )}
                </div>

                {/* Duplicate warning banner */}
                {fieldErrors.combo && (
                  <div
                    className="alert alert-danger py-1 mb-3"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    {fieldErrors.combo}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={loading || Object.keys(fieldErrors).length > 0}
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

      {/* ── Confirm Toggle Modal ──────────────────────────────────── */}
      {confirmModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal">
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Confirmation
            </h6>
            <p className="mb-1" style={{ fontSize: "0.88rem" }}>
              Do you want to make <strong>{confirmModal.label}</strong>{" "}
              <strong>
                {confirmModal.currentStatus === "Active"
                  ? "Inactive"
                  : "Active"}
              </strong>
              ?
            </p>
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button className="btn btn-sm btn-success" onClick={handleToggle}>
                Yes
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  setConfirmModal({
                    show: false,
                    sno: null,
                    currentStatus: "",
                    label: "",
                  })
                }
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
