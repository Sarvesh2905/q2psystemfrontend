import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth, isLoggedIn } from "../../utils/auth";

const API = "http://localhost:5001/api/price";
const LTSAAPI = "http://localhost:5001/api/ltsaprice";
const PAGESIZE = 50;

const generateLtsaCode = () => {
  const num = Math.floor(10 + Math.random() * 90);
  return `LTSAGE${num}`;
};

const emptyStandardForm = {
  LTSACode: "DEFAULT00",
  Customerpartno: "",
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

const emptyLtsaForm = {
  LTSACode: "",
  Customerpartno: "",
  Cftipartno: "",
  Description: "",
  ListPrice: "",
  StartDate: "",
  ExpDate: "",
  Curr: "USD",
  Leadtime: "",
  DeliveryTerm: "",
  Product: "",
  Market: "FM",
};

export default function Price() {
  const navigate = useNavigate();
  const { token, user } = getAuth();
  const role = user?.role;
  const canEdit = role === "Admin" || role === "Manager";
  const canDownload = role === "Admin" || role === "Manager";

  const [isLtsa, setIsLtsa] = useState(false);
  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [searchVal, setSearchVal] = useState("");
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(emptyStandardForm);
  const [editSno, setEditSno] = useState(null);
  const [openQuoteWarning, setOpenQuoteWarning] = useState("");
  const [options, setOptions] = useState({
    leadtimes: [],
    deliveryterms: [],
    products: [],
  });
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    sno: null,
    currentStatus: "",
    partno: "",
  });

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

  const applyFilter = (data, q) => {
    const ql = (q ?? "").trim().toLowerCase();
    setFiltered(
      !ql
        ? data
        : data.filter((row) =>
            [
              row.Cftipartno,
              row.LTSACode,
              row.Customerpartno,
              row.Description,
              row.Product,
              row.Market,
              row.status,
            ]
              .map((v) => (v ?? "").toLowerCase())
              .some((v) => v.includes(ql)),
          ),
    );
    setPage(1);
  };

  const fetchData = useCallback(async () => {
    try {
      const url = isLtsa ? LTSAAPI : API;
      const { data } = await axios.get(url, { headers });
      setAllData(data);
      applyFilter(data, searchVal);
    } catch {
      showAlert("Failed to load data.", "danger");
    }
  }, [token, isLtsa]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live Search
  const handleLiveSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    applyFilter(allData, val);
  };

  const handleClear = () => {
    setSearchVal("");
    applyFilter(allData, "");
  };

  const totalPages = Math.ceil(filtered.length / PAGESIZE);
  const paginated = filtered.slice((page - 1) * PAGESIZE, page * PAGESIZE);

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);

  // ✅ FIXED: openAdd clears alert
  const openAdd = () => {
    if (isLtsa) setForm({ ...emptyLtsaForm, LTSACode: generateLtsaCode() });
    else setForm(emptyStandardForm);
    setOpenQuoteWarning("");
    setAlert({ msg: "", type: "" }); // ✅
    setPanel("add");
  };

  const closePanel = () => {
    setPanel(null);
    setForm(emptyStandardForm);
    setEditSno(null);
    setOpenQuoteWarning("");
  };

  // ✅ FIXED: handleRowDblClick clears alert
  const handleRowDblClick = async (row) => {
    if (!canEdit) return;
    if (row.status === "Inactive") {
      showAlert(
        `${row.Cftipartno} is Inactive and cannot be edited.`,
        "warning",
      );
      return;
    }
    try {
      const { data } = await axios.get(`${API}/checkopenquote`, {
        headers,
        params: { cftipartno: row.Cftipartno, custpartno: row.Customerpartno },
      });
      setOpenQuoteWarning(data.openquote ? data.message : "");
    } catch {
      setOpenQuoteWarning("");
    }
    setEditSno(row.Sno);
    setForm({
      LTSACode: row.LTSACode ?? (isLtsa ? "" : "DEFAULT00"),
      Customerpartno: row.Customerpartno ?? "",
      Cftipartno: row.Cftipartno ?? "",
      Description: row.Description ?? "",
      ListPrice: isLtsa ? row.SplPrice : row.ListPrice,
      StartDate: row.StartDate ? row.StartDate.split("T")[0] : "",
      ExpDate: row.ExpDate ? row.ExpDate.split("T")[0] : "",
      Curr: row.Curr ?? "USD",
      Leadtime: row.Leadtime ?? "",
      DeliveryTerm: row.DeliveryTerm ?? "",
      SPLCond: row.SPLCond ?? "",
      Remarks: row.Remarks ?? "",
      Product: row.Product ?? "",
      Market: row.Market ?? "FM",
    });
    setAlert({ msg: "", type: "" }); // ✅
    setPanel("edit");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isLtsa ? LTSAAPI : API;
      const payload = isLtsa
        ? { ...form, SplPrice: form.ListPrice }
        : { ...form, LTSACode: "DEFAULT00" };
      const { data } = await axios.post(url, payload, { headers });
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      if (isLtsa && err.response?.data?.message?.includes("already exists")) {
        setForm((prev) => ({ ...prev, LTSACode: generateLtsaCode() }));
        showAlert(
          "Code conflict — new code generated. Please Save again.",
          "warning",
        );
      } else {
        showAlert(
          err.response?.data?.message || "Error adding record.",
          "danger",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isLtsa ? `${LTSAAPI}/${editSno}` : `${API}/${editSno}`;
      const payload = isLtsa
        ? {
            ExpDate: form.ExpDate || null,
            Leadtime: form.Leadtime || null,
            DeliveryTerm: form.DeliveryTerm || null,
          }
        : {
            ExpDate: form.ExpDate || null,
            Leadtime: form.Leadtime || null,
            DeliveryTerm: form.DeliveryTerm || null,
            SPLCond: form.SPLCond || null,
            Remarks: form.Remarks || null,
          };
      const { data } = await axios.put(url, payload, { headers });
      showAlert(data.message, "success");
      closePanel();
      fetchData();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error updating.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const { sno, currentStatus } = confirmModal;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setConfirmModal({ show: false, sno: null, currentStatus: "", partno: "" });
    try {
      const url = isLtsa ? `${LTSAAPI}/toggle/${sno}` : `${API}/toggle/${sno}`;
      await axios.patch(url, { status: newStatus }, { headers });
      fetchData();
    } catch {
      showAlert("Failed to toggle status.", "danger");
    }
  };

  const handleDownload = async () => {
    if (!canDownload) {
      showAlert("Access denied.", "danger");
      return;
    }
    try {
      const url = isLtsa ? `${LTSAAPI}/download` : `${API}/download`;
      const response = await axios.get(url, { headers, responseType: "blob" });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = isLtsa
        ? `ltsaprice_${new Date().toISOString().split("T")[0]}.xlsx`
        : `standardprice_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      showAlert("Failed to download file.", "danger");
    }
  };

  const lockedStyle = { background: "#f0f0f0" };

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
            Masters &rsaquo; <strong>Price Master</strong>
          </span>
        </div>

        <h5 className="master-page-title mb-3">
          <i className="bi bi-currency-dollar me-2" />
          Price Master
        </h5>

        {/* Alert */}
        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2`}>{alert.msg}</div>
        )}

        {/* LTSA Toggle */}
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="ltsaToggle"
              checked={isLtsa}
              onChange={(e) => {
                setIsLtsa(e.target.checked);
                closePanel();
                setSearchVal("");
              }}
            />
            <label
              className="form-check-label fw-semibold"
              htmlFor="ltsaToggle"
              style={{
                color: isLtsa ? "#1976d2" : "#555",
                fontSize: "0.88rem",
              }}
            >
              {isLtsa ? "LTSA Price" : "Standard Price"}
            </label>
          </div>
        </div>

        {/* Toolbar */}
        <div className="master-toolbar mb-3 d-flex flex-wrap align-items-center gap-2">
          <div>
            <label className="form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Search CFTI PN / LTSA Code / Description / Product
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 300 }}
              placeholder="Search..."
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
            {canDownload && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={handleDownload}
              >
                <i className="bi bi-download me-1" />
                Export
              </button>
            )}
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
                  <th style={{ width: "4%" }}>S.No</th>
                  <th style={{ width: "10%" }}>LTSA Code</th>
                  <th style={{ width: "11%" }}>Customer PN</th>
                  <th style={{ width: "11%" }}>CFTI PN</th>
                  <th>Description</th>
                  <th style={{ width: "8%" }}>Price</th>
                  <th style={{ width: "9%" }}>Start Date</th>
                  <th style={{ width: "9%" }}>Exp Date</th>
                  <th style={{ width: "6%" }}>Curr</th>
                  <th style={{ width: "8%" }}>Product</th>
                  <th style={{ width: "6%" }}>Market</th>
                  <th style={{ width: "7%" }}>Status</th>
                  {canEdit && <th style={{ width: "7%" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 13 : 12}
                      className="text-center text-muted py-4"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row, idx) => (
                    <tr
                      key={row.Sno}
                      onDoubleClick={() => handleRowDblClick(row)}
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
                          style={{ background: "#1976d2", fontSize: "0.75rem" }}
                        >
                          {row.LTSACode || "---"}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {row.Customerpartno || "---"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{row.Cftipartno}</td>
                      <td style={{ fontSize: "0.82rem" }}>{row.Description}</td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {isLtsa ? row.SplPrice : row.ListPrice}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {row.StartDate?.split("T")[0] ?? "---"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {row.ExpDate?.split("T")[0] ?? "---"}
                      </td>
                      <td>{row.Curr}</td>
                      <td style={{ fontSize: "0.82rem" }}>{row.Product}</td>
                      <td>
                        <span
                          className={`badge ${
                            row.Market === "FM"
                              ? "bg-info text-dark"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {row.Market}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.status === "Active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
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
                                partno: row.Cftipartno,
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
              className="master-edit-panel"
              style={{ flex: "0 0 41%", overflowY: "auto" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0" style={{ color: "#8B0000" }}>
                  <i
                    className={`bi bi-${panel === "add" ? "plus-circle" : "pencil-square"} me-2`}
                  />
                  {panel === "add" ? "Create Price Entry" : "Edit Price Entry"}
                </h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closePanel}
                />
              </div>

              {openQuoteWarning && (
                <div
                  className="alert alert-warning py-2 mb-2"
                  style={{ fontSize: "0.8rem" }}
                >
                  {openQuoteWarning}
                </div>
              )}

              <form onSubmit={panel === "add" ? handleAdd : handleEdit}>
                <div className="row g-2">
                  {/* LTSA Code */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      LTSA Code{" "}
                      {isLtsa && panel === "add" && (
                        <span className="text-danger">*</span>
                      )}
                      {isLtsa && panel === "add" && (
                        <small className="text-muted ms-1">
                          Auto-generated
                        </small>
                      )}
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.LTSACode}
                      readOnly
                      style={lockedStyle}
                      required
                    />
                  </div>

                  {/* Customer PN */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      Customer PN
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Customerpartno}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({
                          ...f,
                          Customerpartno: e.target.value,
                        }))
                      }
                      readOnly={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                    />
                  </div>

                  {/* CFTI Part No */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      CFTI Part No <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.Cftipartno}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, Cftipartno: e.target.value }))
                      }
                      readOnly={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                      required
                    />
                  </div>

                  {/* Currency */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      Currency <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Curr}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, Curr: e.target.value }))
                      }
                      disabled={panel === "edit"}
                      required
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <label className="form-label form-label-sm">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={form.Description}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, Description: e.target.value }))
                      }
                      required
                      readOnly={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                    />
                  </div>

                  {/* SPL Price / List Price */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      {isLtsa ? "SPL Price" : "List Price"}{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control form-control-sm"
                      value={form.ListPrice}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, ListPrice: e.target.value }))
                      }
                      required
                      readOnly={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                    />
                  </div>

                  {/* Start Date */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      Start Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.StartDate}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, StartDate: e.target.value }))
                      }
                      required
                      readOnly={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                    />
                  </div>

                  {/* Exp Date */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">Exp Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.ExpDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ExpDate: e.target.value }))
                      }
                      disabled={panel === "edit" && !!openQuoteWarning}
                      style={
                        panel === "edit" && openQuoteWarning ? lockedStyle : {}
                      }
                    />
                  </div>

                  {/* Lead Time */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      Lead Time <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Leadtime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, Leadtime: e.target.value }))
                      }
                      required={panel === "add"}
                      disabled={panel === "edit" && !!openQuoteWarning}
                      style={
                        panel === "edit" && openQuoteWarning ? lockedStyle : {}
                      }
                    >
                      <option value="">-- Select Lead Time --</option>
                      {options.leadtimes.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Term */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">
                      Delivery Term <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={form.DeliveryTerm}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, DeliveryTerm: e.target.value }))
                      }
                      required={panel === "add"}
                      disabled={panel === "edit" && !!openQuoteWarning}
                      style={
                        panel === "edit" && openQuoteWarning ? lockedStyle : {}
                      }
                    >
                      <option value="">-- Select Delivery Term --</option>
                      {options.deliveryterms.map((dt) => (
                        <option key={dt} value={dt}>
                          {dt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">Product</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Product}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, Product: e.target.value }))
                      }
                      disabled={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                    >
                      <option value="">-- Select Product --</option>
                      {options.products.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Market */}
                  <div className="col-6">
                    <label className="form-label form-label-sm">Market</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.Market}
                      onChange={(e) =>
                        panel === "add" &&
                        setForm((f) => ({ ...f, Market: e.target.value }))
                      }
                      disabled={panel === "edit"}
                      style={panel === "edit" ? lockedStyle : {}}
                    >
                      <option value="FM">FM</option>
                      <option value="AM">AM</option>
                    </select>
                  </div>

                  {/* SPL Condition (Standard only) */}
                  {!isLtsa && (
                    <div className="col-12">
                      <label className="form-label form-label-sm">
                        Spl. Condition
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.SPLCond}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, SPLCond: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {/* Remarks (Standard only) */}
                  {!isLtsa && (
                    <div className="col-12">
                      <label className="form-label form-label-sm">
                        Remarks
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.Remarks}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, Remarks: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2 mt-3">
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-custom flex-fill"
                    disabled={loading}
                  >
                    {loading && (
                      <span className="spinner-border spinner-border-sm me-1" />
                    )}
                    {panel === "add" ? "Yes, Confirm" : "Update"}
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
              Do you want to make <strong>{confirmModal.partno}</strong>{" "}
              <strong>
                {confirmModal.currentStatus === "Active"
                  ? "Inactive"
                  : "Active"}
              </strong>
              ?
            </p>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-sm btn-success" onClick={handleToggle}>
                Yes, Confirm
              </button>
              <button
                className="btn btn-sm btn-outline-secondary flex-fill"
                onClick={() =>
                  setConfirmModal({
                    show: false,
                    sno: null,
                    currentStatus: "",
                    partno: "",
                  })
                }
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
