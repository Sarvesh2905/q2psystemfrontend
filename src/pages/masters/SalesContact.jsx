import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/salescontact";
const PAGESIZE = 50;

const emptyForm = {
  salescontactname: "",
  email: "",
  mobile: "",
  landline: "",
};

export default function SalesContact() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchVal, setSearchVal] = useState("");
  const [panel, setPanel] = useState(null);
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

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 3500);
  };

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

  const handleLiveSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    const q = val.trim().toLowerCase();
    setFiltered(
      !q
        ? allData
        : allData.filter((row) =>
            [
              row.salescontactname,
              row.email,
              row.mobile,
              row.landline,
              row.status,
            ]
              .map((v) => (v ?? "").toLowerCase())
              .some((v) => v.includes(q)),
          ),
    );
    setPage(1);
  };

  const handleClear = () => {
    setSearchVal("");
    setFiltered(allData);
    setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / PAGESIZE);
  const paginated = filtered.slice((page - 1) * PAGESIZE, page * PAGESIZE);
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);

  const openAdd = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const openEdit = (row) => {
    if (row.status === "Inactive") {
      showAlert(
        `${row.salescontactname} is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setForm({
      salescontactname: row.salescontactname || "",
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
    setEditSno(null);
  };

  // FIXED: pass correct query param name to backend (?name= or ?email=)
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

  const clearErr = (field) => {
    setFieldErrors((prev) => {
      const e = { ...prev };
      delete e[field];
      return e;
    });
  };

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

  const handleEdit = async (e) => {
    e.preventDefault();
    if (Object.keys(fieldErrors).length > 0) return;
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${API}/${editSno}`,
        {
          email: form.email,
          mobile: form.mobile,
          landline: form.landline,
        },
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

  const lockedStyle = { backgroundColor: "#e9ecef" };

  return (
    <DashboardNavbar>
      <div className="container-fluid px-3 py-3">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/masters")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Masters &rsaquo; <strong>Sales Contact</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-person-lines-fill me-2" />
          Sales Contact Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* Toolbar */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search All Columns
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 300 }}
              placeholder="Search Name, Email, Mobile, Landline..."
              value={searchVal}
              onChange={handleLiveSearch}
            />
          </div>
          {searchVal && (
            <button
              className="btn btn-sm btn-outline-secondary align-self-end"
              onClick={handleClear}
            >
              <i className="bi bi-x-circle me-1" />
              Clear
            </button>
          )}
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: "0.82rem" }}>
              Records <strong>{filtered.length}</strong>
            </span>
            {canEdit && (
              <button
                className="btn btn-sm btn-primary-custom"
                onClick={openAdd}
              >
                <i className="bi bi-plus-circle-fill me-1" />
                Add
              </button>
            )}
          </div>
        </div>

        {/* Table + Panel */}
        <div className="d-flex gap-3" style={{ minHeight: "60vh" }}>
          {/* Table */}
          <div
            className="master-table-wrapper"
            style={{
              flex: panel ? "0 0 55%" : 1,
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "4%" }}>S.No</th>
                  <th style={{ width: "22%" }}>Name</th>
                  <th style={{ width: "24%" }}>Email</th>
                  <th style={{ width: "14%" }}>Mobile</th>
                  <th style={{ width: "14%" }}>Landline</th>
                  <th style={{ width: "10%" }}>Status</th>
                  {canEdit && <th style={{ width: "12%" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 7 : 6}
                      className="text-center text-muted py-4"
                    >
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
                      <td>{(page - 1) * PAGESIZE + idx + 1}</td>
                      <td>{row.salescontactname}</td>
                      <td style={{ fontSize: "0.82rem" }}>{row.email}</td>
                      <td style={{ fontSize: "0.82rem" }}>{row.mobile}</td>
                      <td style={{ fontSize: "0.82rem" }}>{row.landline}</td>
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
                    <i className="bi bi-chevron-left" />
                  </button>
                  {pageNumbers.map((p, i, arr) => (
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
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          {panel && (
            <div
              className="master-side-panel"
              style={{ flex: "0 0 43%", maxHeight: "82vh", overflowY: "auto" }}
            >
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"} me-2`}
                  />
                  {panel === "add"
                    ? "Create Sales Contact"
                    : "Modify Sales Contact"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <form
                onSubmit={panel === "add" ? handleAdd : handleEdit}
                noValidate
              >
                {/* Name — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Name{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm${fieldErrors.name ? " is-invalid" : ""}`}
                    value={form.salescontactname}
                    onChange={(e) => {
                      setForm({ ...form, salescontactname: e.target.value });
                      clearErr("name");
                    }}
                    onBlur={() =>
                      panel === "add" &&
                      form.salescontactname &&
                      checkField("name", form.salescontactname)
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={45}
                    placeholder="Enter Full Name"
                  />
                  {fieldErrors.name && (
                    <div className="invalid-feedback">{fieldErrors.name}</div>
                  )}
                </div>

                {/* Email */}
                <div className="mb-2">
                  <label className="form-label panel-label">Email</label>
                  <input
                    type="email"
                    className={`form-control form-control-sm${fieldErrors.email ? " is-invalid" : ""}`}
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      clearErr("email");
                    }}
                    onBlur={() => form.email && checkField("email", form.email)}
                    maxLength={60}
                    placeholder="abc@company.com"
                  />
                  {fieldErrors.email && (
                    <div className="invalid-feedback">{fieldErrors.email}</div>
                  )}
                </div>

                {/* Mobile */}
                <div className="mb-2">
                  <label className="form-label panel-label">Mobile</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.mobile}
                    onChange={(e) =>
                      setForm({ ...form, mobile: e.target.value })
                    }
                    maxLength={10}
                    placeholder="10-digit mobile"
                  />
                </div>

                {/* Landline */}
                <div className="mb-3">
                  <label className="form-label panel-label">Landline</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.landline}
                    onChange={(e) =>
                      setForm({ ...form, landline: e.target.value })
                    }
                    maxLength={15}
                    placeholder="e.g. 0422-234567"
                  />
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={loading || Object.keys(fieldErrors).length > 0}
                  >
                    {loading && (
                      <span className="spinner-border spinner-border-sm me-1" />
                    )}
                    <i
                      className={`bi ${panel === "add" ? "bi-check-circle" : "bi-pencil-square"} me-1`}
                    />
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

        {/* Confirm Toggle Modal */}
        {confirmModal.show && (
          <div className="modal-backdrop-custom">
            <div className="confirm-modal">
              <h6 className="mb-3" style={{ color: "#800000" }}>
                <i className="bi bi-exclamation-triangle-fill me-2" />
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
                <button
                  className="btn btn-sm btn-success"
                  onClick={handleToggle}
                >
                  Yes
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() =>
                    setConfirmModal({
                      show: false,
                      sno: null,
                      currentStatus: "",
                    })
                  }
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardNavbar>
  );
}
