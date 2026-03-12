import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/status-master";
const PAGE_SIZE = 50;

const emptyForm = { Data: "", Description: "" };

export default function StatusMaster() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchVal, setSearchVal] = useState("");
  const [panel, setPanel] = useState(null); // 'add' | 'edit' | null
  const [form, setForm] = useState(emptyForm);
  const [editSno, setEditSno] = useState(null);
  const [editDataLocked, setEditDataLocked] = useState("");
  const [dupError, setDupError] = useState("");
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    sno: null,
    currentStatus: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
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

  // ── Search ───────────────────────────────────────────────────────────────
  const handleSearch = () => {
    const q = searchVal.trim().toLowerCase();
    setFiltered(
      allData.filter((row) => !q || (row.Data || "").toLowerCase().includes(q)),
    );
    setPage(1);
  };

  const handleClear = () => {
    setSearchVal("");
    setFiltered(allData);
    setPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Open Add ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  // ── Double-click → Open Edit ──────────────────────────────────────────────
  const handleRowDblClick = (row) => {
    if (row.Status === "Inactive") {
      showAlert(
        `The Status "${row.Data}" is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setEditSno(row.Sno);
    setEditDataLocked(row.Data); // Data is LOCKED — cannot be changed
    setForm({ Data: row.Data, Description: row.Description || "" });
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setDupError("");
    setEditSno(null);
    setEditDataLocked("");
  };

  // ── Duplicate check ───────────────────────────────────────────────────────
  const checkDuplicate = async (val) => {
    if (!val.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check?status=${encodeURIComponent(val)}`,
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
      const { data } = await axios.post(
        API,
        { Data: form.Data, Description: form.Description },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error adding Status.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
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
        err.response?.data?.message || "Error updating Status.",
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
    setConfirmModal({ show: false, sno: null, currentStatus: "", name: "" });
    try {
      await axios.patch(
        `${API}/toggle/${sno}`,
        { status: newStatus },
        { headers },
      );
      fetchData();
    } catch {
      showAlert("Failed to toggle status.", "danger");
    }
  };

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
            Masters &rsaquo; <strong>Status (Opportunity Stage)</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-diagram-3 me-2"></i>Status (Opportunity Stage)
          Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* Toolbar */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-end gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Status
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "220px" }}
              placeholder="Search by Status..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
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

        {/* Table + Side Panel */}
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
                  <th style={{ width: "7%" }}>S.No</th>
                  <th style={{ width: "30%" }}>Status</th>
                  <th>Description</th>
                  <th style={{ width: "12%" }}>Status</th>
                  {canEdit && <th style={{ width: "10%" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 5 : 4}
                      className="text-center text-muted py-4"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row, idx) => (
                    <tr
                      key={row.Sno}
                      onDoubleClick={() => canEdit && handleRowDblClick(row)}
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
                          {row.Data}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "#555" }}>
                        {row.Description || (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${row.Status === "Active" ? "bg-success" : "bg-secondary"}`}
                        >
                          {row.Status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-center">
                          <button
                            className={`btn btn-xs status-btn ${row.Status === "Active" ? "status-active" : "status-inactive"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                show: true,
                                sno: row.Sno,
                                currentStatus: row.Status,
                                name: row.Data,
                              });
                            }}
                          >
                            {row.Status}
                          </button>
                        </td>
                      )}
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

          {/* Side Panel — Add or Edit */}
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
                  {panel === "add" ? "Create Status" : "Edit Status"}
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
                {/* Status / Data field */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Status <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${dupError ? "is-invalid" : ""}`}
                        value={form.Data}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          setForm((f) => ({ ...f, Data: v }));
                          setDupError("");
                          if (v.trim()) checkDuplicate(v);
                        }}
                        required
                        placeholder="e.g. ENQUIRY"
                        maxLength={45}
                        autoFocus
                      />
                      <small
                        className="text-muted"
                        style={{ fontSize: "0.74rem" }}
                      >
                        Auto-converted to UPPERCASE. Max 45 characters.
                      </small>
                    </>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editDataLocked}
                      readOnly
                      style={{
                        backgroundColor: "#f5f5f5",
                        cursor: "not-allowed",
                        fontWeight: 600,
                      }}
                    />
                  )}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="form-label panel-label">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    maxLength={150}
                    value={form.Description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, Description: e.target.value }))
                    }
                    placeholder="Optional description..."
                  />
                  <small className="text-muted" style={{ fontSize: "0.74rem" }}>
                    Max 150 characters.
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={
                      loading ||
                      (panel === "add" && (!!dupError || !form.Data.trim()))
                    }
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i
                        className={`bi ${panel === "add" ? "bi-check-circle" : "bi-save"} me-1`}
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

      {/* Confirm Toggle Modal */}
      {confirmModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal">
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Confirmation
            </h6>
            <p className="mb-4" style={{ fontSize: "0.88rem" }}>
              Do you want to make <strong>{confirmModal.name}</strong>{" "}
              <strong>
                {confirmModal.currentStatus === "Active"
                  ? "Inactive"
                  : "Active"}
              </strong>
              ?
            </p>
            <div className="d-flex gap-2 justify-content-end">
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
                    name: "",
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
