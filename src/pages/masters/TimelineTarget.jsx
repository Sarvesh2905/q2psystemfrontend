import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/timeline-target";
const PAGESIZE = 50;

const NUMERICFIELDS = [
  { key: "Enquiry", label: "Enquiry" },
  { key: "Technicaloffer", label: "Technical Offer" },
  { key: "Pricedoffer", label: "Priced Offer" },
  { key: "Pricebookorder", label: "Price Book Order" },
  { key: "Regret", label: "Regret" },
  { key: "Cancelled", label: "Cancelled" },
];

const emptyForm = {
  Product: "",
  Enquiry: "",
  Technicaloffer: "",
  Pricedoffer: "",
  Pricebookorder: "",
  Regret: "",
  Cancelled: "",
};

export default function TimelineTarget() {
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
  const [editProductLocked, setEditProductLocked] = useState("");
  const [availProducts, setAvailProducts] = useState([]);
  const [dupError, setDupError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    sno: null,
    currentStatus: "",
    name: "",
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // Fetch table data
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

  // Fetch available products (not yet assigned)
  const fetchAvailProducts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/available-products`, {
        headers,
      });
      setAvailProducts(data);
    } catch {}
  }, [token]);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  // Live Search
  const handleLiveSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    const q = val.trim().toLowerCase();
    setFiltered(
      !q
        ? allData
        : allData.filter((row) =>
            (row.Product ?? "").toLowerCase().includes(q),
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

  // ✅ FIXED: openAdd clears alert
  const openAdd = async () => {
    await fetchAvailProducts();
    setForm(emptyForm);
    setDupError("");
    setFormErrors({});
    setAlert({ msg: "", type: "" }); // ✅
    setPanel("add");
  };

  // ✅ FIXED: handleRowDblClick clears alert
  const handleRowDblClick = (row) => {
    setEditSno(row.Sno);
    setEditProductLocked(row.Product);
    setForm({
      Product: row.Product,
      Enquiry: String(row.Enquiry),
      Technicaloffer: String(row.Technicaloffer),
      Pricedoffer: String(row.Pricedoffer),
      Pricebookorder: String(row.Pricebookorder),
      Regret: String(row.Regret),
      Cancelled: String(row.Cancelled),
    });
    setDupError("");
    setFormErrors({});
    setAlert({ msg: "", type: "" }); // ✅
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setDupError("");
    setFormErrors({});
    setEditSno(null);
    setEditProductLocked("");
  };

  // Validate numeric fields
  const validateNumerics = (f) => {
    const errs = {};
    NUMERICFIELDS.forEach(({ key, label }) => {
      if (f[key] === "" || f[key] === null || f[key] === undefined)
        errs[key] = `${label} is required.`;
      else if (isNaN(Number(f[key])) || Number(f[key]) < 0)
        errs[key] = `${label} must be a non-negative number.`;
    });
    return errs;
  };

  // ADD
  const handleAdd = async (e) => {
    e.preventDefault();
    if (dupError) return;
    const errs = validateNumerics(form);
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
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

  // EDIT
  const handleEdit = async (e) => {
    e.preventDefault();
    const errs = validateNumerics(form);
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.put(`${API}/${editSno}`, form, { headers });
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

  // TOGGLE
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

  // Numeric input handler
  const handleNumericChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
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
            Masters &rsaquo; <strong>Timeline Target</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-bar-chart-steps me-2" />
          Timeline Target Master
        </h5>

        {/* Alert */}
        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* Toolbar */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Product
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 220 }}
              placeholder="Search by Product..."
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
              flex: panel ? "0 0 57%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>S.No</th>
                  <th style={{ width: "14%" }}>Product</th>
                  <th style={{ width: "10%" }}>Enquiry</th>
                  <th style={{ width: "10%" }}>Tech. Offer</th>
                  <th style={{ width: "10%" }}>Priced Offer</th>
                  <th style={{ width: "12%" }}>PB Order</th>
                  <th style={{ width: "10%" }}>Regret</th>
                  <th style={{ width: "10%" }}>Cancelled</th>
                  {canEdit && <th style={{ width: "10%" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 9 : 8}
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
                      <td>{(page - 1) * PAGESIZE + idx + 1}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "#800000",
                            color: "#fff",
                            fontSize: "0.78rem",
                          }}
                        >
                          {row.Product}
                        </span>
                      </td>
                      <td>{row.Enquiry}</td>
                      <td>{row.Technicaloffer}</td>
                      <td>{row.Pricedoffer}</td>
                      <td>{row.Pricebookorder}</td>
                      <td>{row.Regret}</td>
                      <td>{row.Cancelled}</td>
                      {canEdit && (
                        <td className="text-center">
                          <button
                            className={`btn btn-xs status-btn ${
                              row.status === "Active"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                show: true,
                                sno: row.Sno,
                                currentStatus: row.status,
                                name: row.Product,
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
              style={{ flex: "0 0 41%", maxHeight: "82vh", overflowY: "auto" }}
            >
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${
                      panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"
                    } me-2`}
                  />
                  {panel === "add"
                    ? "Create Timeline Target"
                    : "Modify Timeline Target"}
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
                {/* Product — dropdown on add, locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Product <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Product}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, Product: e.target.value }))
                      }
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {availProducts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editProductLocked}
                      readOnly
                      style={{ backgroundColor: "#e9ecef" }}
                    />
                  )}
                </div>

                {/* Numeric fields */}
                {NUMERICFIELDS.map(({ key, label }) => (
                  <div className="mb-2" key={key}>
                    <label className="form-label panel-label">
                      {label} (days) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={`form-control form-control-sm ${
                        formErrors[key] ? "is-invalid" : ""
                      }`}
                      value={form[key]}
                      onChange={(e) => handleNumericChange(key, e.target.value)}
                      placeholder={`Enter ${label}`}
                      required
                    />
                    {formErrors[key] && (
                      <div className="invalid-feedback">{formErrors[key]}</div>
                    )}
                  </div>
                ))}

                <div className="d-flex gap-2 mt-3">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={loading || !!dupError}
                  >
                    {loading && (
                      <span className="spinner-border spinner-border-sm me-1" />
                    )}
                    <i
                      className={`bi ${
                        panel === "add" ? "bi-check-circle" : "bi-pencil-square"
                      } me-1`}
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

      {/* Confirm Toggle Modal */}
      {confirmModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal">
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2" />
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
