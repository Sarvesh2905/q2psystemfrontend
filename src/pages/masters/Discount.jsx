import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/discount";
const PAGE_SIZE = 50;

const emptyForm = {
  Type: "",
  Category: "",
  Market: "",
  Product: "",
  Discount: "",
};

export default function Discount() {
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
  const [editMeta, setEditMeta] = useState({});
  const [options, setOptions] = useState({ categories: [], products: [] });
  const [fieldErrors, setFieldErrors] = useState({});
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [warnModal, setWarnModal] = useState({ show: false, msg: "" });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/options`, { headers })
      .then((r) => setOptions(r.data))
      .catch(() => {});
  }, [token]);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
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
              row.Type,
              row.Category,
              row.Product,
              row.Market,
              row.Discount != null ? String(row.Discount) : "",
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
    setEditSno(row.Sno);
    setEditMeta({
      Type: row.Type,
      Category: row.Category,
      Market: row.Market,
      Product: row.Product,
    });
    setForm({ ...emptyForm, Discount: row.Discount ?? "" });
    setFieldErrors({});
    setAlert({ msg: "", type: "" });
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setFieldErrors({});
  };

  const checkDuplicate = async (type, category, product, market) => {
    if (!type || !category || !product || !market) return;
    try {
      const { data } = await axios.get(
        `${API}/check?type=${encodeURIComponent(type)}&category=${encodeURIComponent(category)}&product=${encodeURIComponent(product)}&market=${encodeURIComponent(market)}`,
        { headers },
      );
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, combo: data.message }));
      else
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e.combo;
          return e;
        });
    } catch {}
  };

  const checkOpenQuoteOnDiscount = async (discountVal) => {
    if (!editMeta.Category || !editMeta.Product) return;
    try {
      const { data } = await axios.get(
        `${API}/check/openquote?category=${encodeURIComponent(editMeta.Category)}&product=${encodeURIComponent(editMeta.Product)}&discount=${discountVal}`,
        { headers },
      );
      if (data.discountchange) setWarnModal({ show: true, msg: data.message });
    } catch {}
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
        err.response?.data?.message || "Error adding discount.",
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
      const { data } = await axios.put(
        `${API}/${editSno}`,
        { Discount: form.Discount },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating discount.",
        "danger",
      );
    } finally {
      setLoading(false);
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
            Masters &rsaquo; <strong>Discount</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-percent me-2"></i>Discount Master
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
              style={{ width: "280px" }}
              placeholder="Search Type, Category, Product, Market, Discount..."
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
              flex: panel ? "0 0 57%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover master-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>S.No</th>
                  <th style={{ width: "10%" }}>Type</th>
                  <th style={{ width: "28%" }}>Category</th>
                  <th style={{ width: "25%" }}>Product</th>
                  <th style={{ width: "8%" }}>Market</th>
                  <th style={{ width: "14%" }}>Discount (%)</th>
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
                      <td>
                        <span
                          className={`badge ${row.Type === "Item" ? "bg-primary" : "bg-secondary"}`}
                          style={{ fontSize: "0.78rem" }}
                        >
                          {row.Type}
                        </span>
                      </td>
                      <td>{row.Category}</td>
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
                      <td>
                        <span
                          className={`badge ${row.Market === "FM" ? "bg-info text-dark" : "bg-warning text-dark"}`}
                          style={{ fontSize: "0.78rem" }}
                        >
                          {row.Market}
                        </span>
                      </td>
                      <td className="text-end">
                        <strong style={{ color: "#800000" }}>
                          {row.Discount !== null ? `${row.Discount}%` : "—"}
                        </strong>
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
            <div className="master-side-panel" style={{ flex: "0 0 41%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"} me-2`}
                  ></i>
                  {panel === "add" ? "Create Discount" : "Modify Discount"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {/* Duplicate warning banner */}
              {fieldErrors.combo && (
                <div
                  className="alert alert-danger py-1 mb-3"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  {fieldErrors.combo}
                </div>
              )}

              <form
                onSubmit={panel === "add" ? handleAdd : handleEdit}
                noValidate
              >
                {/* TYPE — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Type{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Type}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, Type: e.target.value }));
                        setFieldErrors((prev) => {
                          const e2 = { ...prev };
                          delete e2.combo;
                          return e2;
                        });
                      }}
                      required
                    >
                      <option value="">-- Select Type --</option>
                      <option value="Item">Item</option>
                      <option value="Project">Project</option>
                    </select>
                  ) : (
                    <input
                      className="form-control form-control-sm"
                      value={editMeta.Type}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* CATEGORY — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Category{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Category}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          Category: e.target.value,
                        }));
                        setFieldErrors((prev) => {
                          const e2 = { ...prev };
                          delete e2.combo;
                          return e2;
                        });
                      }}
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {options.categories.map((c, i) => (
                        <option key={i} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-control form-control-sm"
                      value={editMeta.Category}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* PRODUCT — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Product{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Product}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          Product: e.target.value,
                        }));
                        setFieldErrors((prev) => {
                          const e2 = { ...prev };
                          delete e2.combo;
                          return e2;
                        });
                      }}
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {options.products.map((p, i) => (
                        <option key={i} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-control form-control-sm"
                      value={editMeta.Product}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* MARKET — locked in edit; duplicate check on change */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Market{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  {panel === "add" ? (
                    <select
                      className={`form-select form-select-sm ${fieldErrors.combo ? "is-invalid" : ""}`}
                      value={form.Market}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((prev) => ({ ...prev, Market: v }));
                        setFieldErrors((prev) => {
                          const e2 = { ...prev };
                          delete e2.combo;
                          return e2;
                        });
                        if (form.Type && form.Category && form.Product && v)
                          checkDuplicate(
                            form.Type,
                            form.Category,
                            form.Product,
                            v,
                          );
                      }}
                      required
                    >
                      <option value="">-- Select Market --</option>
                      <option value="FM">FM</option>
                      <option value="AM">AM</option>
                    </select>
                  ) : (
                    <input
                      className="form-control form-control-sm"
                      value={editMeta.Market}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* DISCOUNT — always editable */}
                <div className="mb-4">
                  <label className="form-label panel-label">
                    Discount (%) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    className="form-control form-control-sm"
                    value={form.Discount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, Discount: e.target.value }))
                    }
                    onBlur={(e) => {
                      if (panel === "edit")
                        checkOpenQuoteOnDiscount(e.target.value);
                    }}
                    required
                    placeholder="e.g. 10.5"
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

      {/* ── Open Quote Warning Modal ──────────────────────────────────── */}
      {warnModal.show && (
        <div className="modal-backdrop-custom">
          <div className="confirm-modal" style={{ maxWidth: "420px" }}>
            <h6 className="mb-3" style={{ color: "#800000" }}>
              <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
              WARNING!!!
            </h6>
            <div
              className="mb-4"
              style={{ fontSize: "0.88rem" }}
              dangerouslySetInnerHTML={{ __html: warnModal.msg }}
            />
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-sm btn-primary-custom"
                onClick={() => setWarnModal({ show: false, msg: "" })}
              >
                OK, Proceed
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setWarnModal({ show: false, msg: "" });
                  setForm((prev) => ({ ...prev, Discount: "" }));
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
