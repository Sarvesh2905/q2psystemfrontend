import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/product";
const PAGE_SIZE = 50;

const emptyForm = {
  Products: "",
  Description: "",
  FacingFactory: "",
  Prdgroup: "",
};

export default function Product() {
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
    productName: "",
  });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4000);
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
              row.Products,
              row.Description,
              row.FacingFactory,
              row.Prdgroup,
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
      showAlert(
        `"${row.Products}" is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setForm({
      Products: row.Products || "",
      Description: row.Description || "",
      FacingFactory: row.FacingFactory || "",
      Prdgroup: row.Prdgroup || "",
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

  const checkProduct = async (val) => {
    if (!val.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check?product=${encodeURIComponent(val.trim())}`,
        { headers },
      );
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, Products: data.message }));
      else
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e.Products;
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
      showAlert(
        err.response?.data?.message || "Error adding product.",
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
        { Description: form.Description },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating product.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const { sno, currentStatus } = confirmModal;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setConfirmModal({
      show: false,
      sno: null,
      currentStatus: "",
      productName: "",
    });
    try {
      const { data } = await axios.patch(
        `${API}/toggle/${sno}`,
        { status: newStatus },
        { headers },
      );
      if (data.openquote) {
        showAlert(data.message, "warning");
      } else {
        fetchData();
      }
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
            Masters &rsaquo; <strong>Product</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-box-seam-fill me-2"></i>Product Master
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
              placeholder="Search Product, Description, Factory, Group..."
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
                  <th style={{ width: "4%" }}>S.No</th>
                  <th style={{ width: "22%" }}>Product</th>
                  <th style={{ width: "28%" }}>Description</th>
                  <th style={{ width: "18%" }}>Facing Factory</th>
                  <th style={{ width: "16%" }}>Group</th>
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
                      <td>
                        <strong>{row.Products}</strong>
                      </td>
                      <td style={{ fontSize: "0.84rem" }}>
                        {row.Description || "—"}
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {row.FacingFactory}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ backgroundColor: "#800000", color: "#fff" }}
                        >
                          {row.Prdgroup}
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
                                productName: row.Products,
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
            <div className="master-side-panel" style={{ flex: "0 0 41%" }}>
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"} me-2`}
                  ></i>
                  {panel === "add" ? "Create Product" : "Modify Product"}
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
                {/* Product Name — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Product Name{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${fieldErrors.Products ? "is-invalid" : ""}`}
                    value={form.Products}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      setForm({ ...form, Products: v });
                      clearErr("Products");
                      checkProduct(v);
                    }}
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={60}
                    placeholder="e.g. REGULATOR"
                  />
                  {fieldErrors.Products && (
                    <div className="invalid-feedback">
                      {fieldErrors.Products}
                    </div>
                  )}
                </div>

                {/* Description — always editable */}
                <div className="mb-3">
                  <label className="form-label panel-label">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={4}
                    value={form.Description}
                    onChange={(e) =>
                      setForm({ ...form, Description: e.target.value })
                    }
                    maxLength={150}
                    placeholder="Optional product description..."
                  />
                  <small className="text-muted">
                    {form.Description?.length || 0}/150 characters
                  </small>
                </div>

                {/* Facing Factory — locked in edit */}
                <div className="mb-3">
                  <label className="form-label panel-label">
                    Facing Factory{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.FacingFactory}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        FacingFactory: e.target.value.toUpperCase(),
                      })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={45}
                    placeholder="e.g. CFTI"
                  />
                </div>

                {/* Prdgroup — locked in edit */}
                <div className="mb-4">
                  <label className="form-label panel-label">
                    Group{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Prdgroup}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        Prdgroup: e.target.value.toUpperCase(),
                      })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={45}
                    placeholder="e.g. RGL"
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
              Do you want to make the Product{" "}
              <strong className="text-primary">
                {confirmModal.productName}
              </strong>{" "}
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
                    productName: "",
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
