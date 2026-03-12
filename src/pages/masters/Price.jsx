import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/price";
const PAGE_SIZE = 50;

const emptyForm = {
  LTSACode: "DEFAULT00",
  Customerpartno: "N",
  Cftipartno: "",
  Description: "",
  ListPrice: "",
  StartDate: "",
  ExpDate: "",
  Curr: "USD",
  Leadtime: "",
  DeliveryTerm: "",
  SPLCond: "",
  Remarks: "",
  Product: "",
  Market: "FM",
};

// Format date for <input type="date"> (YYYY-MM-DD)
const toInputDate = (val) => {
  if (!val) return "";
  if (typeof val === "string" && val.includes("T")) return val.split("T")[0];
  return val;
};

// Format date for display (DD-MM-YYYY)
const fmtDisplay = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

export default function Price() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchLTSA, setSearchLTSA] = useState("");
  const [searchPartno, setSearchPartno] = useState("");
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
  const [options, setOptions] = useState({
    leadtimes: [],
    deliveryterms: [],
    products: [],
  });
  const [hasOpenQuote, setHasOpenQuote] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, []);

  // ── Load dropdown options ─────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API}/options`, { headers })
      .then((r) => setOptions(r.data))
      .catch(() => {});
  }, [token]);

  // ── Fetch data ────────────────────────────────────────────────────────────
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

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  // ── Today's date for default StartDate ───────────────────────────────────
  const todayISO = () => new Date().toISOString().split("T")[0];

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    const l = searchLTSA.trim().toLowerCase();
    const p = searchPartno.trim().toLowerCase();
    setFiltered(
      allData.filter(
        (row) =>
          (!l || (row.LTSACode || "").toLowerCase().includes(l)) &&
          (!p || (row.Cftipartno || "").toLowerCase().includes(p)),
      ),
    );
    setPage(1);
  };

  const handleClear = () => {
    setSearchLTSA("");
    setSearchPartno("");
    setFiltered(allData);
    setPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Open Add Panel ────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...emptyForm, StartDate: todayISO() });
    setFieldErrors({});
    setHasOpenQuote(false);
    setAlert({ msg: "", type: "" });
    setPanel("add");
  };

  // ── Open Edit Panel ───────────────────────────────────────────────────────
  const openEdit = async (row) => {
    if (row.status === "Inactive") {
      showAlert(
        `This price entry is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    setForm({
      LTSACode: row.LTSACode || "DEFAULT00",
      Customerpartno: row.Customerpartno || "N",
      Cftipartno: row.Cftipartno || "",
      Description: row.Description || "",
      ListPrice: row.ListPrice ?? "",
      StartDate: toInputDate(row.StartDate),
      ExpDate: toInputDate(row.ExpDate),
      Curr: row.Curr || "USD",
      Leadtime: row.Leadtime || "",
      DeliveryTerm: row.DeliveryTerm || "",
      SPLCond: row.SPLCond || "",
      Remarks: row.Remarks || "",
      Product: row.Product || "",
      Market: row.Market || "",
    });
    setEditSno(row.Sno);
    setFieldErrors({});
    setHasOpenQuote(false);
    setAlert({ msg: "", type: "" });

    // Check if open quote exists — if so, lock Leadtime/DeliveryTerm
    try {
      const params =
        row.Customerpartno &&
        row.Customerpartno !== "Y" &&
        row.Customerpartno !== "N"
          ? `cftipartno=${encodeURIComponent(row.Cftipartno)}&custpartno=${encodeURIComponent(row.Customerpartno)}`
          : `cftipartno=${encodeURIComponent(row.Cftipartno)}`;
      const { data } = await axios.get(`${API}/check/openquote?${params}`, {
        headers,
      });
      if (data.openquote) {
        setHasOpenQuote(true);
        showAlert(data.message, "warning");
      }
    } catch {}

    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyForm);
    setFieldErrors({});
    setHasOpenQuote(false);
  };

  // ── Check Customer PartNo duplicate ──────────────────────────────────────
  const checkCustPartno = async (val) => {
    if (!val || val === "Y" || val === "N") return;
    try {
      const { data } = await axios.get(
        `${API}/check/custpartno?custpartno=${encodeURIComponent(val)}`,
        { headers },
      );
      if (data.exists)
        setFieldErrors((prev) => ({ ...prev, Customerpartno: data.message }));
      else
        setFieldErrors((prev) => {
          const e = { ...prev };
          delete e.Customerpartno;
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
      showAlert(err.response?.data?.message || "Error adding price.", "danger");
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
        {
          ExpDate: form.ExpDate,
          Leadtime: form.Leadtime,
          DeliveryTerm: form.DeliveryTerm,
          SPLCond: form.SPLCond,
          Remarks: form.Remarks,
        },
        { headers },
      );
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Error updating price.",
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
  const today = todayISO();
  // Min expiry = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];

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
            Masters &rsaquo; <strong>Price (Standard)</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-tags-fill me-2"></i>Standard Price Master
        </h5>

        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`} role="alert">
            {alert.msg}
          </div>
        )}

        {/* ── Toolbar ──────────────────────────────────────────────── */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-end gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              LTSA Code
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "150px" }}
              placeholder="Search LTSA Code..."
              value={searchLTSA}
              onChange={(e) => setSearchLTSA(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              CFTI Part No.
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: "170px" }}
              placeholder="Search Part No..."
              value={searchPartno}
              onChange={(e) => setSearchPartno(e.target.value)}
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
              flex: panel ? "0 0 57%" : "1",
              transition: "flex 0.3s",
              overflowX: "auto",
            }}
          >
            <table
              className="table table-bordered table-hover master-table mb-0"
              style={{ fontSize: "0.82rem" }}
            >
              <thead>
                <tr>
                  <th style={{ width: "3%" }}>S.No</th>
                  <th style={{ width: "9%" }}>LTSA Code</th>
                  <th style={{ width: "8%" }}>Cust.PN</th>
                  <th style={{ width: "12%" }}>CFTI Part No.</th>
                  <th style={{ width: "16%" }}>Description</th>
                  <th style={{ width: "7%" }}>Price</th>
                  <th style={{ width: "9%" }}>Start Date</th>
                  <th style={{ width: "9%" }}>Exp Date</th>
                  <th style={{ width: "5%" }}>Curr</th>
                  <th style={{ width: "8%" }}>Product</th>
                  <th style={{ width: "5%" }}>Market</th>
                  <th style={{ width: "9%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center text-muted py-4">
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
                          className="badge bg-dark"
                          style={{ fontSize: "0.72rem" }}
                        >
                          {row.LTSACode}
                        </span>
                      </td>
                      <td>{row.Customerpartno || "—"}</td>
                      <td>
                        <strong>{row.Cftipartno}</strong>
                      </td>
                      <td
                        style={{
                          maxWidth: "150px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.Description || "—"}
                      </td>
                      <td className="text-end">
                        <strong>
                          {row.Curr} {Number(row.ListPrice).toFixed(2)}
                        </strong>
                      </td>
                      <td>{fmtDisplay(row.StartDate)}</td>
                      <td>
                        {row.ExpDate ? (
                          <span
                            className={
                              new Date(row.ExpDate) < new Date()
                                ? "text-danger"
                                : ""
                            }
                          >
                            {fmtDisplay(row.ExpDate)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>{row.Curr}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "#800000",
                            color: "#fff",
                            fontSize: "0.72rem",
                          }}
                        >
                          {row.Product}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${row.Market === "FM" ? "bg-info text-dark" : "bg-warning text-dark"}`}
                          style={{ fontSize: "0.72rem" }}
                        >
                          {row.Market}
                        </span>
                      </td>
                      <td className="text-center">
                        {canEdit ? (
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

          {/* ── Side Panel ───────────────────────────────────────── */}
          {panel && (
            <div
              className="master-side-panel"
              style={{ flex: "0 0 41%", maxHeight: "85vh", overflowY: "auto" }}
            >
              <div className="panel-header d-flex justify-content-between align-items-center mb-3">
                <h6
                  className="mb-0"
                  style={{ color: "#800000", fontWeight: 700 }}
                >
                  <i
                    className={`bi ${panel === "add" ? "bi-plus-circle-fill" : "bi-pencil-fill"} me-2`}
                  ></i>
                  {panel === "add"
                    ? "Create Price Entry"
                    : "Modify Price Entry"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {hasOpenQuote && panel === "edit" && (
                <div
                  className="alert alert-warning py-1 mb-2"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  Open quotes exist — <strong>
                    Leadtime & Delivery Term
                  </strong>{" "}
                  are locked.
                </div>
              )}

              <form
                onSubmit={panel === "add" ? handleAdd : handleEdit}
                noValidate
              >
                {/* LTSA Code — always locked in standard price (DEFAULT00) */}
                <div className="mb-2">
                  <label className="form-label panel-label">LTSA Code</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.LTSACode}
                    readOnly
                    style={lockedStyle}
                  />
                </div>

                {/* Customer Part No — Y/N dropdown for standard, locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Customer Part No.
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Customerpartno}
                      onChange={(e) =>
                        setForm({ ...form, Customerpartno: e.target.value })
                      }
                    >
                      <option value="N">N</option>
                      <option value="Y">Y</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Customerpartno}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* CFTI Part No — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    CFTI Part No.{" "}
                    {panel === "add" && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.Cftipartno}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        Cftipartno: e.target.value.toUpperCase(),
                      })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    maxLength={20}
                    placeholder="e.g. RGL-001"
                  />
                </div>

                {/* Description — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    value={form.Description}
                    onChange={(e) =>
                      setForm({ ...form, Description: e.target.value })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required
                    maxLength={52}
                    placeholder="Product description"
                  />
                </div>

                {/* List Price — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    List Price <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-control form-control-sm"
                    value={form.ListPrice}
                    onChange={(e) =>
                      setForm({ ...form, ListPrice: e.target.value })
                    }
                    readOnly={panel === "edit"}
                    style={panel === "edit" ? lockedStyle : {}}
                    required={panel === "add"}
                    placeholder="e.g. 1250.00"
                  />
                </div>

                {/* Start Date + Exp Date */}
                <div className="mb-2 d-flex gap-2">
                  <div style={{ flex: 1 }}>
                    <label className="form-label panel-label">
                      Start Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.StartDate}
                      onChange={(e) =>
                        setForm({ ...form, StartDate: e.target.value })
                      }
                      readOnly={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                      required={panel === "add"}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label panel-label">Exp. Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.ExpDate}
                      onChange={(e) =>
                        setForm({ ...form, ExpDate: e.target.value })
                      }
                      min={tomorrowISO}
                    />
                  </div>
                </div>

                {/* Currency — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Currency <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Curr}
                      onChange={(e) =>
                        setForm({ ...form, Curr: e.target.value })
                      }
                      required
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Curr}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* Lead Time — locked if open quote */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Lead Time <span className="text-danger">*</span>
                    {hasOpenQuote && (
                      <span
                        className="ms-1 text-danger"
                        style={{ fontSize: "0.75rem" }}
                      >
                        🔒 Locked
                      </span>
                    )}
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={form.Leadtime}
                    onChange={(e) =>
                      setForm({ ...form, Leadtime: e.target.value })
                    }
                    disabled={hasOpenQuote}
                    required={panel === "add"}
                  >
                    <option value="">-- Select Lead Time --</option>
                    {options.leadtimes.map((lt, i) => (
                      <option key={i} value={lt}>
                        {lt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delivery Term — locked if open quote */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Delivery Term <span className="text-danger">*</span>
                    {hasOpenQuote && (
                      <span
                        className="ms-1 text-danger"
                        style={{ fontSize: "0.75rem" }}
                      >
                        🔒 Locked
                      </span>
                    )}
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={form.DeliveryTerm}
                    onChange={(e) =>
                      setForm({ ...form, DeliveryTerm: e.target.value })
                    }
                    disabled={hasOpenQuote}
                    required={panel === "add"}
                  >
                    <option value="">-- Select Delivery Term --</option>
                    {options.deliveryterms.map((dt, i) => (
                      <option key={i} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Product <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Product}
                      onChange={(e) =>
                        setForm({ ...form, Product: e.target.value })
                      }
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
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Product}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* Market — locked in edit */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Market <span className="text-danger">*</span>
                  </label>
                  {panel === "add" ? (
                    <select
                      className="form-select form-select-sm"
                      value={form.Market}
                      onChange={(e) =>
                        setForm({ ...form, Market: e.target.value })
                      }
                      required
                    >
                      <option value="FM">FM</option>
                      <option value="AM">AM</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Market}
                      readOnly
                      style={lockedStyle}
                    />
                  )}
                </div>

                {/* SPLCond — always editable */}
                <div className="mb-2">
                  <label className="form-label panel-label">
                    Spl. Condition
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={form.SPLCond}
                    onChange={(e) =>
                      setForm({ ...form, SPLCond: e.target.value })
                    }
                    maxLength={10}
                    placeholder="Optional"
                  />
                </div>

                {/* Remarks — always editable */}
                <div className="mb-3">
                  <label className="form-label panel-label">Remarks</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={form.Remarks}
                    onChange={(e) =>
                      setForm({ ...form, Remarks: e.target.value })
                    }
                    maxLength={10}
                    placeholder="Optional"
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
              Do you want to make this Price entry{" "}
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
