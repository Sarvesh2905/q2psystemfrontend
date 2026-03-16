import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/salescontact";
const PAGE_SIZE = 50;
const emptyForm = { salescontactname: "", email: "", mobile: "", landline: "" };

export default function SalesContact() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);

  // single search input
  const [searchVal, setSearchVal] = useState("");

  const [panel, setPanel] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(emptyForm);
  const [editSno, setEditSno] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    sno: null,
    currentStatus: "",
  });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 3500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
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

  // ── Single Search (name / email / mobile / landline / status) ────────────
  const handleSearch = () => {
    const q = searchVal.trim().toLowerCase();
    if (!q) {
      setFiltered(allData);
      setPage(1);
      return;
    }

    setFiltered(
      allData.filter((row) => {
        const name = (row.salescontactname || "").toLowerCase();
        const email = (row.email || "").toLowerCase();
        const mobile = (row.mobile || "").toLowerCase();
        const landline = (row.landline || "").toLowerCase();
        const status = (row.status || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          mobile.includes(q) ||
          landline.includes(q) ||
          status.includes(q)
        );
      }),
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

  // ── Panel ─────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const openEdit = (row) => {
    if (row.status === "Inactive") {
      showAlert(
        `"${row.salescontactname}" is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setForm({
      salescontactname: row.salescontactname,
      email: row.email || "",
      mobile: row.mobile || "",
      landline: row.landline || "",
    });
    setEditSno(row.Sno);
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setFieldErrors({});
  };

  // ── Duplicate checks (on blur) ────────────────────────────────────────────
  const checkField = async (field, value) => {
    if (!value.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check?${field}=${encodeURIComponent(value.trim())}`,
        { headers },
      );
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, [field]: data.message }));
      else
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e[field];
          return e;
        });
    } catch {}
  };

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
        err.response?.data?.message || "Error adding record.",
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
        { mobile: form.mobile, landline: form.landline },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating record.",
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
    setConfirmModal({ show: false, sno: null, currentStatus: "" });
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

  // ── Render ────────────────────────────────────────────────────────────────
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
            Masters &rsaquo; <strong>Sales Contact</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-person-lines-fill me-2"></i>Sales Contact
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* ── Toolbar: single search ───────────────────────────────── */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-end gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search (Name / Email / Mobile / Landline / Status)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "260px" }}
              placeholder="Type to search..."
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

        {/* ── Table + Panel ────────────────────────────────────────── */}
        <div className="d-flex gap-3" style={{ minHeight: "60vh" }}>
          {/* Table */}
          <div
            className="master-table-wrapper"
            style={{
              flex: panel ? "0 0 60%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>S.No</th>
                  <th style={{ width: "22%" }}>Name</th>
                  <th style={{ width: "28%" }}>Email</th>
                  <th style={{ width: "15%" }}>Mobile</th>
                  <th style={{ width: "18%" }}>Landline</th>
                  <th style={{ width: "12%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
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
                      <td>{row.salescontactname}</td>
                      <td>{row.email}</td>
                      <td>{row.mobile || "—"}</td>
                      <td>{row.landline || "—"}</td>
                      <td className="text-center">
                        {canEdit ? (
                          <button
                            className={`btn btn-xs status-btn ${
                              row.status === "Active"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                            onClick={() =>
                              setConfirmModal({
                                show: true,
                                sno: row.Sno,
                                currentStatus: row.status,
                              })
                            }
                          >
                            {row.status}
                          </button>
                        ) : (
                          <span
                            className={`badge ${
                              row.status === "Active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
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
                          <span
                            key={`ellipsis-${p}`}
                            className="btn btn-sm disabled"
                          >
                            …
                          </span>
                        )}
                        <button
                          key={p}
                          className={`btn btn-sm ${
                            page === p
                              ? "btn-primary-custom"
                              : "btn-outline-secondary"
                          }`}
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
            <div className="master-side-panel" style={{ flex: "0 0 38%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${
                      panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"
                    } me-2`}
                  ></i>
                  {panel === "add"
                    ? "Create Sales Contact"
                    : "Modify Sales Contact"}
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
                {/* Name — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Name{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${
                      fieldErrors.name ? "is-invalid" : ""
                    }`}
                    value={form.salescontactname}
                    onChange={(e) => {
                      setForm({ ...form, salescontactname: e.target.value });
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.name;
                        return n;
                      });
                    }}
                    onBlur={() =>
                      panel === "add" &&
                      checkField("name", form.salescontactname)
                    }
                    readOnly={panel === "edit"}
                    style={
                      panel === "edit" ? { backgroundColor: "#e9ecef" } : {}
                    }
                    required={panel === "add"}
                    placeholder="Enter Name"
                    maxLength={45}
                  />
                  {fieldErrors.name && (
                    <div className="invalid-feedback">{fieldErrors.name}</div>
                  )}
                </div>

                {/* Email — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Email{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="email"
                    className={`form-control form-control-sm ${
                      fieldErrors.email ? "is-invalid" : ""
                    }`}
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.email;
                        return n;
                      });
                    }}
                    onBlur={() =>
                      panel === "add" && checkField("email", form.email)
                    }
                    readOnly={panel === "edit"}
                    style={
                      panel === "edit" ? { backgroundColor: "#e9ecef" } : {}
                    }
                    required={panel === "add"}
                    placeholder="Enter Email"
                    maxLength={60}
                  />
                  {fieldErrors.email && (
                    <div className="invalid-feedback">{fieldErrors.email}</div>
                  )}
                </div>

                {/* Mobile — editable always */}
                <div className="mb-3">
                  <label className="form-label panel-label">Mobile</label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${
                      fieldErrors.mobile ? "is-invalid" : ""
                    }`}
                    value={form.mobile}
                    onChange={(e) => {
                      setForm({ ...form, mobile: e.target.value });
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.mobile;
                        return n;
                      });
                    }}
                    onBlur={() =>
                      form.mobile && checkField("mobile", form.mobile)
                    }
                    placeholder="10-digit mobile"
                    maxLength={10}
                  />
                  {fieldErrors.mobile && (
                    <div className="invalid-feedback">{fieldErrors.mobile}</div>
                  )}
                </div>

                {/* Landline — editable always */}
                <div className="mb-4">
                  <label className="form-label panel-label">Landline</label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${
                      fieldErrors.landline ? "is-invalid" : ""
                    }`}
                    value={form.landline}
                    onChange={(e) => {
                      setForm({ ...form, landline: e.target.value });
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.landline;
                        return n;
                      });
                    }}
                    onBlur={() =>
                      form.landline && checkField("landline", form.landline)
                    }
                    placeholder="e.g. 044-12345678"
                    maxLength={15}
                  />
                  {fieldErrors.landline && (
                    <div className="invalid-feedback">
                      {fieldErrors.landline}
                    </div>
                  )}
                </div>

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
                        className={`bi ${
                          panel === "add"
                            ? "bi-check-circle"
                            : "bi-pencil-square"
                        } me-1`}
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
            <p className="mb-4">
              Do you want to make the Sales Contact{" "}
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
                  setConfirmModal({ show: false, sno: null, currentStatus: "" })
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
