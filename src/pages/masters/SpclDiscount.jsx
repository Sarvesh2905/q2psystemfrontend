import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/spcl-discount";
const PAGE_SIZE = 50;

export default function SpclDiscount() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState("");
  const [panel, setPanel] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [dupError, setDupError] = useState("");
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    sno: null,
    currentStatus: "",
    name: "",
  });
  const [openQuoteModal, setOpenQuoteModal] = useState({
    show: false,
    msg: "",
  });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // ── Load customer dropdown ────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API}/customers`, { headers })
      .then((r) => setCustomers(r.data))
      .catch(() => {});
  }, [token]);

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

  // ── Search by Name ────────────────────────────────────────────────────────
  const handleSearch = () => {
    const n = searchName.trim().toLowerCase();
    setFiltered(
      allData.filter((row) => !n || (row.Name || "").toLowerCase().includes(n)),
    );
    setPage(1);
  };

  const handleClear = () => {
    setSearchName("");
    setFiltered(allData);
    setPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Open Add Panel ────────────────────────────────────────────────────────
  const openAdd = () => {
    setSelectedName("");
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const closePanel = () => {
    setPanel(null);
    setSelectedName("");
    setDupError("");
  };

  // ── Duplicate check fires on name select change (same as original) ────────
  const checkDuplicate = async (custname) => {
    if (!custname) return;
    try {
      const { data } = await axios.get(
        `${API}/check?custname=${encodeURIComponent(custname)}`,
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
    if (!selectedName) {
      setDupError("Please select a Customer.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        API,
        { Name: selectedName },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error adding special discount.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── TOGGLE ────────────────────────────────────────────────────────────────
  const initiateToggle = (row) => {
    setConfirmModal({
      show: true,
      sno: row.Sno,
      currentStatus: row.status,
      name: row.Name,
    });
  };

  const handleToggle = async () => {
    const { sno, currentStatus } = confirmModal;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setConfirmModal({ show: false, sno: null, currentStatus: "", name: "" });
    try {
      const { data } = await axios.patch(
        `${API}/toggle/${sno}`,
        { status: newStatus },
        { headers },
      );
      if (data.openquote) {
        setOpenQuoteModal({ show: true, msg: data.message });
      } else {
        fetchData();
      }
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
            Masters &rsaquo; <strong>Special Discount</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-star-fill me-2"></i>Special Discount Master
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
              Name
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "220px" }}
              placeholder="Search by Name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
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
                  <th style={{ width: "72%" }}>Name</th>
                  <th style={{ width: "12%" }}>Status</th>
                  {canEdit && <th style={{ width: "10%" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 4 : 3}
                      className="text-center text-muted py-4"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row, idx) => (
                    <tr key={row.Sno}>
                      <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <i className="bi bi-person-circle me-2 text-muted"></i>
                        {row.Name}
                      </td>
                      <td>
                        <span
                          className={`badge ${row.status === "Active" ? "bg-success" : "bg-secondary"}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-center">
                          <button
                            className={`btn btn-xs status-btn ${row.status === "Active" ? "status-active" : "status-inactive"}`}
                            onClick={() => initiateToggle(row)}
                          >
                            {row.status}
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

          {/* ── Add Panel ────────────────────────────────────────── */}
          {panel === "add" && (
            <div className="master-side-panel" style={{ flex: "0 0 41%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i className="bi bi-plus-circle-fill me-2"></i>Create Special
                  Discount
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

              <form onSubmit={handleAdd} noValidate>
                <div className="mb-4">
                  <label className="form-label panel-label">
                    Name (Customer) <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select form-select-sm ${dupError ? "is-invalid" : ""}`}
                    value={selectedName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedName(v);
                      setDupError("");
                      if (v) checkDuplicate(v);
                    }}
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c, i) => (
                      <option key={i} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted" style={{ fontSize: "0.76rem" }}>
                    Only active customers are listed.
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={loading || !!dupError || !selectedName}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="bi bi-check-circle me-1"></i>
                    )}
                    Save
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

      {/* ── Confirm Toggle Modal ──────────────────────────────────────── */}
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

      {/* ── Open Quote Warning Modal ──────────────────────────────────── */}
      {openQuoteModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal" style={{ maxWidth: "420px" }}>
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
              WARNING!!!
            </h6>
            <p className="mb-4" style={{ fontSize: "0.88rem" }}>
              {openQuoteModal.msg}
            </p>
            <div className="d-flex justify-content-end">
              <button
                className="btn btn-sm btn-primary-custom"
                onClick={() => setOpenQuoteModal({ show: false, msg: "" })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
