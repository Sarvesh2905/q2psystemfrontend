import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/country";
const PAGE_SIZE = 50;

const emptyForm = {
  Countrycode: "",
  Countryname: "",
  Region: "",
  Currency: "",
  CurrencyName: "",
  Conversionrate: "",
};

export default function Country() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);

  // single search
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

  // ── Single search across ALL columns ─────────────────────────────────────
  const handleSearch = () => {
    const q = searchVal.trim().toLowerCase();
    if (!q) {
      setFiltered(allData);
      setPage(1);
      return;
    }
    setFiltered(
      allData.filter((row) =>
        [
          row.Countrycode,
          row.Countryname,
          row.Region,
          row.Currency,
          row.CurrencyName,
          row.Conversionrate != null ? String(row.Conversionrate) : "",
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const openEdit = (row) => {
    if (row.status === "Inactive") {
      showAlert(`"${row.Countryname}" is Inactive and cannot be edited.`, "warning");
      return;
    }
    setForm({
      Countrycode: row.Countrycode || "",
      Countryname: row.Countryname || "",
      Region: row.Region || "",
      Currency: row.Currency || "",
      CurrencyName: row.CurrencyName || "",
      Conversionrate: row.Conversionrate ?? "",
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

  const checkCountrycode = async () => {
    if (!form.Countrycode.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check?countrycode=${encodeURIComponent(form.Countrycode.trim())}`,
        { headers },
      );
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, Countrycode: data.message }));
      else
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e.Countrycode;
          return e;
        });
    } catch {}
  };

  const clearErr = (field) =>
    setFieldErrors((prev) => {
      const e = { ...prev };
      delete e[field];
      return e;
    });

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
      showAlert(err.response?.data?.message || "Error adding country.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${API}/${editSno}`,
        { Region: form.Region, Conversionrate: form.Conversionrate },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error updating country.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const { sno, currentStatus } = confirmModal;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setConfirmModal({ show: false, sno: null, currentStatus: "" });
    try {
      await axios.patch(`${API}/toggle/${sno}`, { status: newStatus }, { headers });
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
          <button className="btn btn-sm back-btn" onClick={() => navigate("/masters")}>
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <span className="text-muted" style={{ fontSize: "0.88rem" }}>
            Masters &rsaquo; <strong>Country</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-globe2 me-2"></i>Country Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* ── Single Search Toolbar ─────────────────────────────── */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-end gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search (All Columns)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "280px" }}
              placeholder="Search Code, Name, Region, Currency..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="d-flex gap-2 align-items-end">
            <button className="btn btn-sm btn-primary-custom" onClick={handleSearch}>
              <i className="bi bi-search me-1"></i>Search
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={handleClear}>
              <i className="bi bi-x-circle me-1"></i>Clear
            </button>
          </div>
          <div className="ms-auto d-flex align-items-end gap-2">
            <span className="text-muted" style={{ fontSize: "0.82rem" }}>
              Records: <strong>{filtered.length}</strong>
            </span>
            {canEdit && (
              <button className="btn btn-sm btn-primary-custom" onClick={openAdd}>
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
            style={{ flex: panel ? "0 0 58%" : "1", transition: "flex 0.3s", overflowX: "auto" }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "4%" }}>S.No</th>
                  <th style={{ width: "10%" }}>Code</th>
                  <th style={{ width: "20%" }}>Country Name</th>
                  <th style={{ width: "14%" }}>Region</th>
                  <th style={{ width: "8%" }}>Currency</th>
                  <th style={{ width: "16%" }}>Currency Name</th>
                  <th style={{ width: "14%" }}>Conv. to USD</th>
                  <th style={{ width: "14%" }}>Action</th>
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
                      className={panel === "edit" && editSno === row.Sno ? "table-active" : ""}
                    >
                      <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span className="badge bg-secondary">{row.Countrycode}</span>
                      </td>
                      <td>{row.Countryname}</td>
                      <td>{row.Region || "—"}</td>
                      <td><strong>{row.Currency}</strong></td>
                      <td>{row.CurrencyName || "—"}</td>
                      <td>
                        <span className="text-monospace">
                          {row.Conversionrate != null
                            ? Number(row.Conversionrate).toFixed(4)
                            : "—"}
                        </span>
                      </td>
                      <td className="text-center">
                        {canEdit ? (
                          <button
                            className={`btn btn-xs status-btn ${
                              row.status === "Active" ? "status-active" : "status-inactive"
                            }`}
                            onClick={() =>
                              setConfirmModal({ show: true, sno: row.Sno, currentStatus: row.status })
                            }
                          >
                            {row.status}
                          </button>
                        ) : (
                          <span className={`badge ${row.status === "Active" ? "bg-success" : "bg-secondary"}`}>
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
                <small className="text-muted">Page {page} of {totalPages}</small>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((p, i, arr) => (
                      <>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <span key={`e${p}`} className="btn btn-sm disabled">…</span>
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
            <div className="master-side-panel" style={{ flex: "0 0 40%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0" style={{ color: "#800000", fontWeight: 700 }}>
                  <i className={`bi ${panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"} me-2`}></i>
                  {panel === "add" ? "Create Country" : "Modify Country"}
                </h6>
                <button className="btn btn-sm btn-outline-secondary" onClick={closePanel}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={panel === "add" ? handleAdd : handleEdit} noValidate>

                {/* Country Code — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Country Code{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                    <small className="text-muted ms-1">(3 letters, e.g. IND)</small>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.Countrycode ? "is-invalid" : ""}`}
                    value={form.Countrycode}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                      setForm({ ...form, Countrycode: v });
                      clearErr("Countrycode");
                    }}
                    onBlur={() => panel === "add" && checkCountrycode()}
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={3}
                    placeholder="e.g. IND"
                  />
                  {fieldErrors.Countrycode && (
                    <div className="invalid-feedback">{fieldErrors.Countrycode}</div>
                  )}
                </div>

                {/* Country Name — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Country Name{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Countryname}
                    onChange={(e) =>
                      setForm({ ...form, Countryname: e.target.value.toUpperCase() })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={60}
                    placeholder="e.g. INDIA"
                  />
                </div>

                {/* Region — editable always */}
                <div className="mb-3">
                  <label className="form-label panel-label">Region</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Region}
                    onChange={(e) => setForm({ ...form, Region: e.target.value })}
                    maxLength={60}
                    placeholder="e.g. South Asia"
                  />
                </div>

                {/* Currency Code — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Currency Code{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                    <small className="text-muted ms-1">(3 letters, e.g. INR)</small>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Currency}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                      setForm({ ...form, Currency: v });
                    }}
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={3}
                    placeholder="e.g. INR"
                  />
                </div>

                {/* Currency Name — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">Currency Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.CurrencyName}
                    onChange={(e) => setForm({ ...form, CurrencyName: e.target.value })}
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    maxLength={60}
                    placeholder="e.g. Indian Rupee"
                  />
                </div>

                {/* Conversion Rate — editable always */}
                <div className="mb-4">
                  <label className="form-label panel-label">
                    Conversion to USD <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={form.Conversionrate}
                    onChange={(e) => setForm({ ...form, Conversionrate: e.target.value })}
                    required
                    step="any"
                    min="0"
                    placeholder="e.g. 0.012"
                  />
                  <small className="text-muted">
                    Enter how much 1 unit of this currency = USD
                  </small>
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
                      <i className={`bi ${panel === "add" ? "bi-check-circle" : "bi-pencil-square"} me-1`}></i>
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
              Do you want to make the Country{" "}
              <strong>
                {confirmModal.currentStatus === "Active" ? "Inactive" : "Active"}
              </strong>
              ?
            </p>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-sm btn-success" onClick={handleToggle}>Yes</button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => setConfirmModal({ show: false, sno: null, currentStatus: "" })}
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
