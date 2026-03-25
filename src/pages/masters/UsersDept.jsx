import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/deptusers";
const PAGESIZE = 50;

const emptyForm = { deptuserid: "", Username: "", Email: "" };

export default function UsersDept() {
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
  const [editOrigId, setEditOrigId] = useState(null);
  const [idError, setIdError] = useState("");
  const [alert, setAlert] = useState({ msg: "", type: "" });
  // ✅ FIXED: added name: "" to confirmModal state
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
            [row.deptuserid, row.Username, row.Email, row.status]
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
    setIdError("");
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const openEdit = (row) => {
    if (row.status === "Inactive") {
      showAlert(
        `${row.deptuserid} is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setForm({
      deptuserid: row.deptuserid,
      Username: row.Username,
      Email: row.Email,
    });
    setEditOrigId(row.deptuserid);
    setIdError("");
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setIdError("");
    setEditOrigId(null);
  };

  const checkDeptUserId = async () => {
    if (!form.deptuserid) return;
    try {
      const { data } = await axios.get(
        `${API}/check-deptuserid?deptuserid=${encodeURIComponent(form.deptuserid)}`,
        { headers },
      );
      setIdError(data.exists ? data.message : "");
    } catch {
      setIdError("");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (idError) return;
    setLoading(true);
    try {
      const { data } = await axios.post(API, form, { headers });
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error adding user.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${API}/${encodeURIComponent(editOrigId)}`,
        { Username: form.Username, Email: form.Email },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating user.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: handleToggle resets name: ""
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
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Masters &rsaquo; <strong>Application Engineers</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-people-fill me-2" />
          Application Engineers Master
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
              Search ID / Name / Email / Status
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 280 }}
              placeholder="Type to search..."
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
              flex: panel ? "0 0 60%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>S.No</th>
                  <th style={{ width: "20%" }}>Application Engineer ID</th>
                  <th style={{ width: "30%" }}>Application Engineer Name</th>
                  <th style={{ width: "30%" }}>Email</th>
                  <th style={{ width: "10%" }}>Status</th>
                  {canEdit && <th style={{ width: "5%" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 6 : 5}
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
                        panel === "edit" && editOrigId === row.deptuserid
                          ? "table-active"
                          : ""
                      }
                    >
                      <td>{(page - 1) * PAGESIZE + idx + 1}</td>
                      <td>
                        <code
                          style={{
                            fontSize: "0.82rem",
                            backgroundColor: "#f8f0f0",
                            color: "#800000",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {row.deptuserid}
                        </code>
                      </td>
                      <td>{row.Username}</td>
                      <td style={{ fontSize: "0.83rem" }}>{row.Email}</td>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              // ✅ FIXED: passes name: row.deptuserid
                              setConfirmModal({
                                show: true,
                                sno: row.Sno,
                                currentStatus: row.status,
                                name: row.deptuserid,
                              });
                            }}
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
                  {pageNumbers.map((p, i, arr) =>
                    i > 0 && arr[i - 1] !== p - 1 ? (
                      <>
                        <span key={`e${p}`} className="btn btn-sm disabled">
                          …
                        </span>
                        <button
                          key={p}
                          className={`btn btn-sm ${page === p ? "btn-primary-custom" : "btn-outline-secondary"}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </>
                    ) : (
                      <button
                        key={p}
                        className={`btn btn-sm ${page === p ? "btn-primary-custom" : "btn-outline-secondary"}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
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
              style={{ flex: "0 0 38%", maxHeight: "82vh", overflowY: "auto" }}
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
                    ? "Create Application Engineer"
                    : "Modify Application Engineer"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {idError && (
                <div
                  className="alert alert-danger py-1 mb-3"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1" />
                  {idError}
                </div>
              )}

              <form
                onSubmit={panel === "add" ? handleAdd : handleEdit}
                noValidate
              >
                {/* Application Engineer ID */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Application Engineer ID{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <input
                      type="text"
                      className={`form-control form-control-sm ${idError ? "is-invalid" : ""}`}
                      value={form.deptuserid}
                      onChange={(e) => {
                        setForm({ ...form, deptuserid: e.target.value });
                        setIdError("");
                      }}
                      onBlur={checkDeptUserId}
                      required
                      placeholder="Enter ID"
                      autoFocus
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.deptuserid}
                      readOnly
                      style={{
                        backgroundColor: "#e9ecef",
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    />
                  )}
                  {idError && <div className="invalid-feedback">{idError}</div>}
                </div>

                {/* Application Engineer Name */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Application Engineer Name{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Username}
                    onChange={(e) =>
                      setForm({ ...form, Username: e.target.value })
                    }
                    required
                    placeholder="Enter Name"
                    maxLength={100}
                  />
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="form-label panel-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    value={form.Email}
                    onChange={(e) =>
                      setForm({ ...form, Email: e.target.value })
                    }
                    required
                    placeholder="Enter Email"
                    maxLength={75}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={
                      loading ||
                      !!idError ||
                      !form.deptuserid.trim() ||
                      !form.Username.trim() ||
                      !form.Email.trim()
                    }
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
      </div>

      {/* ✅ FIXED: Confirm Modal shows name, resets name: "" */}
      {confirmModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal">
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2" />
              Confirmation
            </h6>
            <p className="mb-4" style={{ fontSize: "0.88rem" }}>
              Do you want to make <code>{confirmModal.name}</code>{" "}
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
