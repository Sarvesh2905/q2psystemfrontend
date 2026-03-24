import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/deptusers";
const PAGE_SIZE = 50;
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
  const [editOrigId, setEditOrigId] = useState("");
  const [idError, setIdError] = useState("");
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
            [row.dept_user_id, row.Username, row.Email, row.status]
              .map((v) => (v || "").toLowerCase())
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setForm(emptyForm);
    setIdError("");
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const openEdit = (row) => {
    if (row.status === "Inactive") {
      showAlert(
        `"${row.dept_user_id}" is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setForm({
      deptuserid: row.dept_user_id,   // ✅ map dept_user_id → form field
      Username: row.Username || "",
      Email: row.Email || "",
    });
    setEditOrigId(row.dept_user_id);   // ✅ use dept_user_id
    setIdError("");
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setIdError("");
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
        { Email: form.Email },
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

  return (
    <>
      <DashboardNavbar />
      <div className="container-fluid px-3 py-3">
        <div className="d-flex align-items-center gap-2 mb-3">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/masters")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Masters &rsaquo; <strong>Users Dept</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-people-fill me-2"></i>Department Users
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`}>{alert.msg}</div>
        )}

        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search (ID / Name / Email / Status)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "260px" }}
              placeholder="Type to filter..."
              value={searchVal}
              onChange={handleLiveSearch}
            />
          </div>
          {searchVal && (
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

        <div className="d-flex gap-3" style={{ minHeight: "60vh" }}>
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
                  <th style={{ width: "35%" }}>Email</th>
                  <th style={{ width: "10%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
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
                        panel === "edit" && editOrigId === row.dept_user_id
                          ? "table-active"
                          : ""
                      }
                    >
                      <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      {/* ✅ FIXED: use dept_user_id (matches actual DB column) */}
                      <td>{row.dept_user_id}</td>
                      <td>{row.Username}</td>
                      <td>{row.Email}</td>
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
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 2,
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

          {panel && (
            <div className="master-side-panel" style={{ flex: "0 0 38%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${
                      panel === "add"
                        ? "bi-plus-circle-fill"
                        : "bi-pencil-fill"
                    } me-2`}
                  ></i>
                  {panel === "add"
                    ? "Create Department User"
                    : "Modify Department User"}
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
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Application Engineer ID{" "}
                    <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          idError ? "is-invalid" : ""
                        }`}
                        value={form.deptuserid}
                        onChange={(e) => {
                          setForm({ ...form, deptuserid: e.target.value });
                          setIdError("");
                        }}
                        onBlur={checkDeptUserId}
                        required
                        placeholder="Enter ID"
                      />
                      {idError && (
                        <div className="invalid-feedback">{idError}</div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.deptuserid}
                      readOnly
                      style={{ backgroundColor: "#e9ecef" }}
                    />
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label panel-label">
                    Application Engineer Name{" "}
                    <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Username}
                      onChange={(e) =>
                        setForm({ ...form, Username: e.target.value })
                      }
                      required
                      placeholder="Enter Name"
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Username}
                      readOnly
                      style={{ backgroundColor: "#e9ecef" }}
                    />
                  )}
                </div>

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
                    disabled={loading || !!idError}
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

      {confirmModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal">
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Confirmation
            </h6>
            <p className="mb-4">
              Do you want to make the Dept User{" "}
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
