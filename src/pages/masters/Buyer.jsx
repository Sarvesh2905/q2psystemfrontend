import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/buyer";
const PAGE_SIZE = 50;

const emptyForm = {
  Customer: "",
  Buyername: "",
  Designation: "",
  email1: "",
  email2: "",
  contact1: "",
  contact2: "",
  contact3: "",
  Location: "",
  Segment: "",
  Comments: "",
};

export default function Buyer() {
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
  const [customers, setCustomers] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/customers`, { headers })
      .then((r) => setCustomers(r.data))
      .catch(() => {});
  }, [token]);

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

  // ── Auto-fill Location & Segment on customer select ───────────────────────
  const handleCustomerChange = (custname) => {
    const found = customers.find((c) => c.customername === custname);
    if (found) {
      const segment =
        (found.customercountry || "").toUpperCase() === "INDIA"
          ? "Domestic"
          : "Export";
      setForm((prev) => ({
        ...prev,
        Customer: custname,
        Location: found.Location,
        Segment: segment,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        Customer: custname,
        Location: "",
        Segment: "",
      }));
    }
  };

  // ── Live Search across ALL columns ────────────────────────────────────────
  const handleLiveSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    const q = val.trim().toLowerCase();
    setFiltered(
      !q
        ? allData
        : allData.filter((row) =>
            [
              row.Customer,
              row.Buyername,
              row.Designation,
              row.email1,
              row.email2,
              row.contact,
              row.Location,
              row.Segment,
              row.Comments,
              row.status,
            ]
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
        `"${row.Buyername}" is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    const contacts = (row.contact || "").split(",");
    setForm({
      Customer: row.Customer || "",
      Buyername: row.Buyername || "",
      Designation: row.Designation || "",
      email1: row.email1 || "",
      email2: row.email2 || "",
      contact1: contacts[0]?.trim() || "",
      contact2: contacts[1]?.trim() || "",
      contact3: contacts[2]?.trim() || "",
      Location: row.Location || "",
      Segment: row.Segment || "",
      Comments: row.Comments || "",
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

  // ── Duplicate checks ──────────────────────────────────────────────────────
  const checkField = async (params) => {
    try {
      const query = new URLSearchParams(params).toString();
      const { data } = await axios.get(`${API}/check?${query}`, { headers });
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else {
        const key = Object.keys(params)[0];
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e[key];
          return e;
        });
      }
    } catch {}
  };

  const clearErr = (field) =>
    setFieldErrors((prev) => {
      const e = { ...prev };
      delete e[field];
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
      showAlert(err.response?.data?.message || "Error adding buyer.", "danger");
    } finally {
      setLoading(false);
    }
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        Designation,
        email1,
        email2,
        contact1,
        contact2,
        contact3,
        Comments,
      } = form;
      const { data } = await axios.put(
        `${API}/${editSno}`,
        { Designation, email1, email2, contact1, contact2, contact3, Comments },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating buyer.",
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
            Masters &rsaquo; <strong>Buyer</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-people-fill me-2"></i>Buyer Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* ── Live Search Toolbar ───────────────────────────────── */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search (All Columns)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "300px" }}
              placeholder="Search Customer, Buyer, Email, Contact, Segment..."
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

        {/* ── Table + Panel ────────────────────────────────────────── */}
        <div className="d-flex gap-3" style={{ minHeight: "60vh" }}>
          {/* Table */}
          <div
            className="master-table-wrapper"
            style={{
              flex: panel ? "0 0 55%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "4%" }}>S.No</th>
                  <th style={{ width: "20%" }}>Customer</th>
                  <th style={{ width: "16%" }}>Buyer Name</th>
                  <th style={{ width: "14%" }}>Designation</th>
                  <th style={{ width: "18%" }}>Email 1</th>
                  <th style={{ width: "14%" }}>Contact</th>
                  <th style={{ width: "8%" }}>Segment</th>
                  <th style={{ width: "6%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
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
                      <td>{row.Customer}</td>
                      <td>{row.Buyername}</td>
                      <td>{row.Designation || "—"}</td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {row.email1 || "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {row.contact || "—"}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.Segment === "Domestic"
                              ? "bg-info text-dark"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {row.Segment || "—"}
                        </span>
                      </td>
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

          {/* ── Side Panel ─────────────────────────────────────── */}
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
                  ></i>
                  {panel === "add" ? "Create Buyer" : "Modify Buyer"}
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
                {/* Customer */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Customer <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Customer}
                      onChange={(e) => {
                        handleCustomerChange(e.target.value);
                        clearErr("buyer");
                      }}
                      required
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c, i) => (
                        <option key={i} value={c.customername}>
                          {c.customername}
                          {c.Location ? ` — ${c.Location}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Customer}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* Location — locked always */}
                <div className="mb-2">
                  <label className="form-label panel-label">Location</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Location}
                    readOnly
                    style={lockedStyle}
                    placeholder="Auto-filled from Customer"
                  />
                </div>

                {/* Buyer Name — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Buyer Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.buyer ? "is-invalid" : ""}`}
                    value={form.Buyername}
                    onChange={(e) => {
                      setForm({ ...form, Buyername: e.target.value });
                      clearErr("buyer");
                    }}
                    onBlur={() =>
                      panel === "add" &&
                      form.Customer &&
                      form.Buyername &&
                      checkField({
                        customer: form.Customer,
                        buyer: form.Buyername,
                      })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={30}
                    placeholder="Enter Buyer Name"
                  />
                  {fieldErrors.buyer && (
                    <div className="invalid-feedback">{fieldErrors.buyer}</div>
                  )}
                </div>

                {/* Designation */}
                <div className="mb-2">
                  <label className="form-label panel-label">Designation</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Designation}
                    onChange={(e) =>
                      setForm({ ...form, Designation: e.target.value })
                    }
                    maxLength={45}
                    placeholder="e.g. Purchase Manager"
                  />
                </div>

                {/* Email 1 */}
                <div className="mb-2">
                  <label className="form-label panel-label">Email 1</label>
                  <input
                    type="email"
                    className={`form-control form-control-sm ${fieldErrors.email1 ? "is-invalid" : ""}`}
                    value={form.email1}
                    onChange={(e) => {
                      setForm({ ...form, email1: e.target.value });
                      clearErr("email1");
                    }}
                    onBlur={() =>
                      form.email1 && checkField({ email1: form.email1 })
                    }
                    maxLength={45}
                    placeholder="abc@gmail.com"
                  />
                  {fieldErrors.email1 && (
                    <div className="invalid-feedback">{fieldErrors.email1}</div>
                  )}
                </div>

                {/* Email 2 */}
                <div className="mb-2">
                  <label className="form-label panel-label">Email 2</label>
                  <input
                    type="email"
                    className={`form-control form-control-sm ${fieldErrors.email2 ? "is-invalid" : ""}`}
                    value={form.email2}
                    onChange={(e) => {
                      setForm({ ...form, email2: e.target.value });
                      clearErr("email2");
                    }}
                    onBlur={() =>
                      form.email2 && checkField({ email2: form.email2 })
                    }
                    maxLength={45}
                    placeholder="abc@gmail.com"
                  />
                  {fieldErrors.email2 && (
                    <div className="invalid-feedback">{fieldErrors.email2}</div>
                  )}
                </div>

                {/* Mobile */}
                <div className="mb-2">
                  <label className="form-label panel-label">Mobile</label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.contact1 ? "is-invalid" : ""}`}
                    value={form.contact1}
                    onChange={(e) => {
                      setForm({ ...form, contact1: e.target.value });
                      clearErr("contact1");
                    }}
                    onBlur={() =>
                      form.contact1 && checkField({ contact1: form.contact1 })
                    }
                    maxLength={
                      (
                        customers.find((c) => c.customername === form.Customer)
                          ?.customercountry || ""
                      ).toUpperCase() === "INDIA"
                        ? 10
                        : 35
                    }
                    placeholder="Mobile"
                  />
                  {fieldErrors.contact1 && (
                    <div className="invalid-feedback">
                      {fieldErrors.contact1}
                    </div>
                  )}
                </div>

                {/* Landline */}
                <div className="mb-2">
                  <label className="form-label panel-label">Landline</label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.contact2 ? "is-invalid" : ""}`}
                    value={form.contact2}
                    onChange={(e) => {
                      setForm({ ...form, contact2: e.target.value });
                      clearErr("contact2");
                    }}
                    onBlur={() =>
                      form.contact2 && checkField({ contact2: form.contact2 })
                    }
                    maxLength={20}
                    placeholder="Landline"
                  />
                  {fieldErrors.contact2 && (
                    <div className="invalid-feedback">
                      {fieldErrors.contact2}
                    </div>
                  )}
                </div>

                {/* Fax */}
                <div className="mb-2">
                  <label className="form-label panel-label">Fax</label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.contact3 ? "is-invalid" : ""}`}
                    value={form.contact3}
                    onChange={(e) => {
                      setForm({ ...form, contact3: e.target.value });
                      clearErr("contact3");
                    }}
                    onBlur={() =>
                      form.contact3 && checkField({ contact3: form.contact3 })
                    }
                    maxLength={20}
                    placeholder="Fax"
                  />
                  {fieldErrors.contact3 && (
                    <div className="invalid-feedback">
                      {fieldErrors.contact3}
                    </div>
                  )}
                </div>

                {/* Segment — locked always */}
                <div className="mb-2">
                  <label className="form-label panel-label">Segment</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Segment}
                    readOnly
                    style={lockedStyle}
                    placeholder="Auto-set (Domestic / Export)"
                  />
                </div>

                {/* Comments */}
                <div className="mb-3">
                  <label className="form-label panel-label">Comments</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    value={form.Comments}
                    onChange={(e) =>
                      setForm({ ...form, Comments: e.target.value })
                    }
                    maxLength={500}
                    placeholder="Optional comments..."
                  />
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
            <p className="mb-4">
              Do you want to make the Buyer{" "}
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
