import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/cost-price";
const PAGE_SIZE = 50;

const CURRENCIES = ["INR", "USD", "EUR"];
const MARKETS = ["FM", "AM"];

const emptyForm = {
  Cfti_partno: "", // ← FIXED
  Description: "",
  Cost_Price: "", // ← FIXED
  Currency: "INR",
  Product: "",
  Market: "",
};

export default function CostPrice() {
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
  const [editPartLocked, setEditPartLocked] = useState("");
  const [products, setProducts] = useState([]);
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

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/products`, { headers });
      setProducts(data);
    } catch {}
  }, [token]);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  const handleLiveSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    const q = val.trim().toLowerCase();
    setFiltered(
      !q
        ? allData
        : allData.filter((row) =>
            [
              row.Cfti_partno, // ← FIXED
              row.Description,
              row.Currency,
              row.Product,
              row.Market,
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

  const openAdd = async () => {
    await fetchProducts();
    setForm(emptyForm);
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  const handleRowDblClick = async (row) => {
    if (row.status === "Inactive") {
      showAlert(
        `"${row.Cfti_partno}" is Inactive and cannot be edited.`, // ← FIXED
        "warning",
      );
      return;
    }
    await fetchProducts();
    setEditSno(row.Sno);
    setEditPartLocked(row.Cfti_partno); // ← FIXED
    setForm({
      Cfti_partno: row.Cfti_partno, // ← FIXED
      Description: row.Description || "",
      Cost_Price: String(row.Cost_Price), // ← FIXED
      Currency: row.Currency || "INR",
      Product: row.Product || "",
      Market: row.Market || "",
    });
    setDupError("");
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setDupError("");
    setEditSno(null);
    setEditPartLocked("");
  };

  const checkDuplicate = async (val) => {
    if (!val.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check?cftipartno=${encodeURIComponent(val)}`,
        { headers },
      );
      if (data.exists) setDupError(data.message);
      else setDupError("");
    } catch {}
  };

  const handleFieldChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (dupError) return;
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

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);

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
            Masters &rsaquo; <strong>Cost Price</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-currency-rupee me-2"></i>Cost Price Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search (All Columns)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "260px" }}
              placeholder="Search Part No, Description, Product..."
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
              flex: panel ? "0 0 57%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>S.No</th>
                  <th style={{ width: panel ? "18%" : "14%" }}>
                    CFTI Part No.
                  </th>
                  <th>Description</th>
                  <th className="text-end" style={{ width: "10%" }}>
                    Cost Price
                  </th>
                  <th style={{ width: "7%" }}>Currency</th>
                  <th style={{ width: "10%" }}>Product</th>
                  <th style={{ width: "7%" }}>Market</th>
                  <th style={{ width: "9%" }}>Status</th>
                  {canEdit && <th style={{ width: "9%" }}>Action</th>}
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
                      <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "#800000",
                            color: "#fff",
                            fontSize: "0.75rem",
                          }}
                        >
                          {row.Cfti_partno} {/* ← FIXED */}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "#444" }}>
                        {row.Description || (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-end" style={{ fontWeight: 600 }}>
                        {Number(row.Cost_Price).toFixed(2)} {/* ← FIXED */}
                      </td>
                      <td className="text-center">
                        <span className="badge bg-secondary">
                          {row.Currency}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {row.Product || <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center">
                        <span
                          className="badge bg-info text-dark"
                          style={{ fontSize: "0.74rem" }}
                        >
                          {row.Market || "—"}
                        </span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                show: true,
                                sno: row.Sno,
                                currentStatus: row.status,
                                name: row.Cfti_partno, // ← FIXED
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
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

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
                  {panel === "add" ? "Create Cost Price" : "Edit Cost Price"}
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
                {/* CFTI Part No. */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    CFTI Part No. <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${dupError ? "is-invalid" : ""}`}
                        value={form.Cfti_partno} // ← FIXED
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          handleFieldChange("Cfti_partno", v); // ← FIXED
                          setDupError("");
                          if (v.trim()) checkDuplicate(v);
                        }}
                        required
                        placeholder="e.g. RGL-001"
                        maxLength={20}
                        autoFocus
                      />
                      <small
                        className="text-muted"
                        style={{ fontSize: "0.74rem" }}
                      >
                        Auto-converted to UPPERCASE. Max 20 characters.
                      </small>
                    </>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editPartLocked}
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
                <div className="mb-3">
                  <label className="form-label panel-label">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    maxLength={100}
                    value={form.Description}
                    onChange={(e) =>
                      handleFieldChange("Description", e.target.value)
                    }
                    placeholder="Optional part description..."
                  />
                  <small className="text-muted" style={{ fontSize: "0.74rem" }}>
                    Max 100 characters.
                  </small>
                </div>

                {/* Cost Price + Currency */}
                <div className="row g-2 mb-3">
                  <div className="col-7">
                    <label className="form-label panel-label">
                      Cost Price <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={form.Cost_Price} // ← FIXED
                      onChange={(e) =>
                        handleFieldChange("Cost_Price", e.target.value)
                      } // ← FIXED
                      required
                      placeholder="0.00"
                      autoFocus={panel === "edit"}
                    />
                  </div>
                  <div className="col-5">
                    <label className="form-label panel-label">
                      Currency <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Currency}
                      onChange={(e) =>
                        handleFieldChange("Currency", e.target.value)
                      }
                      required
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product + Market */}
                <div className="row g-2 mb-4">
                  <div className="col-7">
                    <label className="form-label panel-label">Product</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Product}
                      onChange={(e) =>
                        handleFieldChange("Product", e.target.value)
                      }
                    >
                      <option value="">-- Select --</option>
                      {products.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-5">
                    <label className="form-label panel-label">Market</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Market}
                      onChange={(e) =>
                        handleFieldChange("Market", e.target.value)
                      }
                    >
                      <option value="">-- Select --</option>
                      {MARKETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={
                      loading ||
                      (panel === "add" &&
                        (!!dupError ||
                          !form.Cfti_partno.trim() || // ← FIXED
                          form.Cost_Price === "" || // ← FIXED
                          !form.Currency))
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
