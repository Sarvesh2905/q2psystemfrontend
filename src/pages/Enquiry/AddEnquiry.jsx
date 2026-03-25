import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";

// Working day calculator (skips Sat/Sun)
function addWorkingDays(date, days) {
  let d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function isMoreThan4WorkingDaysAgo(dateStr) {
  if (!dateStr) return false;
  const rfq = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Count working days from rfq to today
  let count = 0;
  let d = new Date(rfq);
  while (d < today) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count > 4;
}

function toInputDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toISOString().split("T")[0];
}

function addDays(dateStr, n) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toInputDate(d);
}

const today = toInputDate(new Date());

const INIT = {
  // Customer
  Customername: "",
  Customertype: "",
  CustomerCountry: "",
  Buyername: "",
  Groupname: "",
  Currency: "",
  Endusername: "",
  EndCountry: "",
  EndIndustry: "",
  EndUse: "",
  // RFQ
  RFQDate: "",
  Deptuser: "",
  Salescontact: "",
  RFQType: "",
  RFQCategory: "",
  RFQreference: "",
  Comments: "",
  // Product
  Facingfactory: "",
  Product: [],
  Projectname: "",
  CustomerdueDate: "",
  ProposeddueDate: addDays(today, 3),
  Totallineitems: "",
  Winprob: "",
  // Quote
  Quotestage: "Enquiry",
  Opportunitystage: "",
  Expectedorderdate: "",
  EffEnqDate: "",
  effEnqOverride: false,
  Priority: "Low",
};

export default function AddEnquiry() {
  const navigate = useNavigate();
  const token = getAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // Dropdown data
  const [customers, setCustomers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [rfqTypes, setRfqTypes] = useState([]);
  const [rfqCategories, setRfqCategories] = useState([]);
  const [oppStages, setOppStages] = useState([]);
  const [endCountries, setEndCountries] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [facingFactories, setFacingFactories] = useState([]);
  const [products, setProducts] = useState([]);

  // Dynamic add state
  const [showAddFF, setShowAddFF] = useState(false);
  const [newFF, setNewFF] = useState("");
  const [showAddOT, setShowAddOT] = useState(false);
  const [newOT, setNewOT] = useState("");

  // Form state
  const [form, setForm] = useState(INIT);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ msg: "", type: "" });

  // Section unlock state
  const [rfqEnabled, setRfqEnabled] = useState(false);
  const [productEnabled, setProductEnabled] = useState(false);
  const [quoteEnabled, setQuoteEnabled] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(false);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  // ── Load dropdowns ──────────────────────────────────────────────────────────
  useEffect(() => {
    const g = (url) => axios.get(`${API}/api/enquiry/${url}`, { headers });
    Promise.all([
      g("getcustomers"),
      g("getappengineers"),
      g("getsalesmanagers"),
      g("getrfqt"),
      g("getqt"),
      g("getqs"),
      g("getstatus?quotestage=ENQUIRY"),
      g("getendcountries"),
      g("getindustries"),
      g("getff"),
    ])
      .then(([cust, eng, sales, rfqt, qt, qs, opp, ec, ind, ff]) => {
        setCustomers(cust.data);
        setEngineers(eng.data);
        setSalesManagers(sales.data);
        setRfqTypes(rfqt.data);
        setRfqCategories(qt.data);
        // Quote stage is always "Enquiry" on creation — just set it
        setOppStages(opp.data);
        setEndCountries(ec.data);
        setIndustries(ind.data);
        setFacingFactories(ff.data);
      })
      .catch(() => showAlert("Failed to load dropdown data.", "danger"));
  }, []); // eslint-disable-line

  // ── Section unlock logic ────────────────────────────────────────────────────
  // Customer complete = name, end user name, end user country, end industry filled
  useEffect(() => {
    const custComplete = !!(
      form.Customername &&
      form.Endusername &&
      form.EndCountry &&
      form.EndIndustry
    );
    setRfqEnabled(custComplete);
    if (!custComplete) {
      setProductEnabled(false);
      setQuoteEnabled(false);
      setSaveEnabled(false);
    }
  }, [form.Customername, form.Endusername, form.EndCountry, form.EndIndustry]);

  useEffect(() => {
    const rfqComplete = !!(
      rfqEnabled &&
      form.RFQDate &&
      form.Deptuser &&
      form.Salescontact &&
      form.RFQType &&
      form.RFQCategory &&
      form.RFQreference
    );
    setProductEnabled(rfqComplete);
    if (!rfqComplete) {
      setQuoteEnabled(false);
      setSaveEnabled(false);
    }
  }, [
    rfqEnabled,
    form.RFQDate,
    form.Deptuser,
    form.Salescontact,
    form.RFQType,
    form.RFQCategory,
    form.RFQreference,
  ]);

  useEffect(() => {
    const prodComplete = !!(
      productEnabled &&
      form.Facingfactory &&
      form.Product?.length > 0 &&
      form.Projectname &&
      form.CustomerdueDate &&
      form.ProposeddueDate &&
      form.Totallineitems &&
      form.Winprob
    );
    setQuoteEnabled(prodComplete);
    if (!prodComplete) setSaveEnabled(false);
  }, [
    productEnabled,
    form.Facingfactory,
    form.Product,
    form.Projectname,
    form.CustomerdueDate,
    form.ProposeddueDate,
    form.Totallineitems,
    form.Winprob,
  ]);

  useEffect(() => {
    const quoteComplete = !!(
      quoteEnabled &&
      form.Opportunitystage &&
      form.Expectedorderdate
    );
    setSaveEnabled(quoteComplete);
  }, [quoteEnabled, form.Opportunitystage, form.Expectedorderdate]);

  // ── Auto-fill currency from customer via country master ─────────────────────
  useEffect(() => {
    if (!form.Customername) return;
    axios
      .get(`${API}/api/enquiry/getcustomerinfo`, {
        headers,
        params: { customername: form.Customername },
      })
      .then((r) => {
        setForm((f) => ({
          ...f,
          Customertype: r.data.custtype || "",
          CustomerCountry: r.data.country || "",
          Groupname: r.data.location || "",
          Currency: r.data.currency || "",
        }));
      })
      .catch(() => {});
    axios
      .get(`${API}/api/enquiry/getbuyers`, {
        headers,
        params: { customer: form.Customername },
      })
      .then((r) => setBuyers(r.data))
      .catch(() => {});
  }, [form.Customername]); // eslint-disable-line

  // ── End industry → description ──────────────────────────────────────────────
  useEffect(() => {
    if (!form.EndIndustry) return;
    axios
      .get(`${API}/api/enquiry/getenduse`, {
        headers,
        params: { endind: form.EndIndustry },
      })
      .then((r) => setForm((f) => ({ ...f, EndUse: r.data.enduse || "" })))
      .catch(() => {});
  }, [form.EndIndustry]); // eslint-disable-line

  // ── Facing factory → products ───────────────────────────────────────────────
  useEffect(() => {
    if (!form.Facingfactory) {
      setProducts([]);
      return;
    }
    axios
      .get(`${API}/api/enquiry/getproducts`, {
        headers,
        params: { facingfactory: form.Facingfactory },
      })
      .then((r) => {
        setProducts(r.data);
        setForm((f) => ({ ...f, Product: [] }));
      })
      .catch(() => {});
  }, [form.Facingfactory]); // eslint-disable-line

  // ── Proposed due date auto = today + 3 ─────────────────────────────────────
  useEffect(() => {
    setForm((f) => ({ ...f, ProposeddueDate: addDays(today, 3) }));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleProduct = useCallback((name) => {
    setForm((f) => {
      const cur = Array.isArray(f.Product) ? f.Product : [];
      const updated = cur.includes(name)
        ? cur.filter((x) => x !== name)
        : [...cur, name];
      return { ...f, Product: updated };
    });
  }, []);

  // ── Dynamic add Facing Factory ──────────────────────────────────────────────
  const handleAddFF = async () => {
    if (!newFF.trim()) return;
    try {
      await axios.post(
        `${API}/api/enquiry/addfacingfactory`,
        { value: newFF },
        { headers },
      );
      const r = await axios.get(`${API}/api/enquiry/getff`, { headers });
      setFacingFactories(r.data);
      setForm((f) => ({ ...f, Facingfactory: newFF.trim().toUpperCase() }));
      setNewFF("");
      setShowAddFF(false);
      showAlert("Facing Factory added!", "success");
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to add.", "danger");
    }
  };

  // ── Dynamic add Opportunity Type ────────────────────────────────────────────
  const handleAddOT = async () => {
    if (!newOT.trim()) return;
    try {
      await axios.post(
        `${API}/api/enquiry/addopportunitytype`,
        { value: newOT },
        { headers },
      );
      const r = await axios.get(`${API}/api/enquiry/getrfqt`, { headers });
      setRfqTypes(r.data);
      setForm((f) => ({ ...f, RFQType: newOT.trim().toUpperCase() }));
      setNewOT("");
      setShowAddOT(false);
      showAlert("Opportunity Type added!", "success");
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to add.", "danger");
    }
  };

  // ── Register Dt. Comments enable logic ─────────────────────────────────────
  const commentsEnabled = isMoreThan4WorkingDaysAgo(form.RFQDate);

  // ── Effective Enquiry Date range ────────────────────────────────────────────
  const effEnqMin = form.RFQDate || today;
  const effEnqMax = today; // register date = today

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!saveEnabled) return;
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/api/enquiry/submit`,
        { ...form, RFQREGDate: today },
        { headers },
      );
      showAlert(
        `Enquiry registered! Quote No: ${res.data.quoteNumber}`,
        "success",
      );
      setTimeout(() => navigate("/enquiry/register"), 1800);
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Failed to submit enquiry.",
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({ ...INIT, ProposeddueDate: addDays(today, 3) });
    setBuyers([]);
    setProducts([]);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      <DashboardNavbar />
      <div className="enq-wrapper">
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/enquiry")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <h5 className="master-page-title mb-0">
            <i className="bi bi-plus-circle-fill me-2" />
            Add Enquiry
          </h5>
        </div>

        {alert.msg && (
          <div
            className={`alert alert-${alert.type} py-2 mb-3`}
            style={{ fontSize: "0.84rem" }}
          >
            {alert.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* ═══ TOP ROW: Customer | RFQ | Product Image Panel ═══ */}
          <div className="enq-top-row">
            {/* ─── SECTION 1: CUSTOMER ─────────────────────────────────── */}
            <div className="enq-form-card enq-section-customer">
              <div className="enq-section-title">
                <i className="bi bi-building me-2" />
                1. Customer
              </div>
              <div className="enq-form-group">
                <label>
                  Customer Name <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Customername}
                  onChange={(e) => set("Customername", e.target.value)}
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.customername} value={c.customername}>
                      {c.customername}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>Customer Category</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.Customertype}
                  readOnly
                  placeholder="Auto-filled"
                />
              </div>
              <div className="enq-form-group">
                <label>Customer Country</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.CustomerCountry}
                  readOnly
                  placeholder="Auto-filled"
                />
              </div>
              <div className="enq-form-group">
                <label>Buyer Name</label>
                <select
                  className="form-select"
                  value={form.Buyername}
                  onChange={(e) => set("Buyername", e.target.value)}
                  disabled={!form.Customername}
                >
                  <option value="">--Select--</option>
                  {buyers.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-row-2">
                <div className="enq-form-group">
                  <label>Group</label>
                  <input
                    className="form-control enq-readonly-field"
                    value={form.Groupname}
                    readOnly
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="enq-form-group">
                  <label>
                    Currency <span className="req">*</span>
                  </label>
                  <input
                    className="form-control enq-readonly-field"
                    value={form.Currency}
                    readOnly
                    placeholder="Auto-filled"
                  />
                </div>
              </div>
              <div className="enq-form-group">
                <label>
                  End User Name <span className="req">*</span>
                </label>
                <input
                  className="form-control"
                  value={form.Endusername}
                  onChange={(e) => set("Endusername", e.target.value)}
                  placeholder="Enter End User Name..."
                  maxLength={50}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  End User Country <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.EndCountry}
                  onChange={(e) => set("EndCountry", e.target.value)}
                >
                  <option value="">Select</option>
                  {endCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>
                  End Industry <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.EndIndustry}
                  onChange={(e) => set("EndIndustry", e.target.value)}
                >
                  <option value="">Select Industry</option>
                  {industries.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>Description</label>
                <textarea
                  className="form-control enq-readonly-field"
                  rows={2}
                  value={form.EndUse}
                  readOnly
                  placeholder="Auto-filled from industry"
                />
              </div>
            </div>

            {/* ─── SECTION 2: RFQ ──────────────────────────────────────── */}
            <div
              className={`enq-form-card enq-section-rfq${!rfqEnabled ? " enq-section-locked" : ""}`}
            >
              <div className="enq-section-title">
                <i className="bi bi-file-earmark-text me-2" />
                2. RFQ
                {!rfqEnabled && (
                  <span className="enq-locked-badge ms-2">
                    <i className="bi bi-lock-fill" />
                  </span>
                )}
              </div>
              <div className="enq-form-group">
                <label>
                  RFQ Receipt Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.RFQDate}
                  max={today}
                  onChange={(e) => set("RFQDate", e.target.value)}
                  disabled={!rfqEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  App. Engineer Name <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Deptuser}
                  onChange={(e) => set("Deptuser", e.target.value)}
                  disabled={!rfqEnabled}
                >
                  <option value="">Select</option>
                  {engineers.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>
                  Sales Contact <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Salescontact}
                  onChange={(e) => set("Salescontact", e.target.value)}
                  disabled={!rfqEnabled}
                >
                  <option value="">Select</option>
                  {salesManagers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {/* Opportunity Type + checkbox to add dynamically */}
              <div className="enq-form-group">
                <label>
                  Opportunity Type <span className="req">*</span>
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select"
                    value={form.RFQType}
                    onChange={(e) => set("RFQType", e.target.value)}
                    disabled={!rfqEnabled}
                  >
                    <option value="">Select</option>
                    {rfqTypes.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input
                    type="checkbox"
                    title="Add new Opportunity Type"
                    checked={showAddOT}
                    onChange={(e) => setShowAddOT(e.target.checked)}
                    disabled={!rfqEnabled}
                  />
                </div>
                {showAddOT && (
                  <div className="enq-dynamic-add mt-1">
                    <input
                      className="form-control form-control-sm"
                      placeholder="New type..."
                      value={newOT}
                      onChange={(e) => setNewOT(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm enq-btn-submit ms-1"
                      onClick={handleAddOT}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary ms-1"
                      onClick={() => {
                        setShowAddOT(false);
                        setNewOT("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="enq-form-group">
                <label>
                  Category <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.RFQCategory}
                  onChange={(e) => set("RFQCategory", e.target.value)}
                  disabled={!rfqEnabled}
                >
                  <option value="">Select</option>
                  {rfqCategories.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>
                  RFQ Reference <span className="req">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.RFQreference}
                  onChange={(e) => set("RFQreference", e.target.value)}
                  placeholder="Enter RFQ Reference..."
                  maxLength={250}
                  disabled={!rfqEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>Register Dt. Comments</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.Comments}
                  onChange={(e) => set("Comments", e.target.value)}
                  placeholder="Your Comments Here..."
                  disabled={!rfqEnabled || !commentsEnabled}
                  style={
                    !rfqEnabled || !commentsEnabled
                      ? { background: "#f0f0f0" }
                      : {}
                  }
                />
                {rfqEnabled && !commentsEnabled && form.RFQDate && (
                  <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                    Enabled only if RFQ date is more than 4 working days ago
                  </small>
                )}
              </div>
            </div>

            {/* ─── RIGHT PANEL: Product Image Display ──────────────────── */}
            <div className="enq-imgpanel-outer">
              <div className="enq-imgpanel-logo">
                <div
                  style={{
                    color: "#800000",
                    fontWeight: 700,
                    fontSize: "1.5rem",
                    letterSpacing: 2,
                    textAlign: "center",
                  }}
                >
                  CIRCOR
                </div>
                <div
                  style={{
                    color: "#aaa",
                    fontSize: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  Product Preview
                </div>
              </div>
              {form.Product?.length === 0 ? (
                <div className="enq-imgpanel-empty mt-3">
                  <i
                    className="bi bi-box-seam"
                    style={{ fontSize: "2rem", color: "#ddd" }}
                  />
                  <p
                    className="mb-0 mt-1"
                    style={{ fontSize: "0.76rem", color: "#bbb" }}
                  >
                    No products selected
                  </p>
                </div>
              ) : (
                <div className="enq-imgpanel-cards">
                  {form.Product.map((prodName) => (
                    <div key={prodName} className="enq-imgpanel-card">
                      {/* Placeholder box for now */}
                      <div className="enq-imgpanel-placeholder">
                        <i
                          className="bi bi-image text-muted"
                          style={{ fontSize: "1.4rem" }}
                        />
                      </div>
                      <div className="enq-imgpanel-prodname">{prodName}</div>
                      <button
                        type="button"
                        className="enq-imgpanel-remove"
                        onClick={() => toggleProduct(prodName)}
                      >
                        <i className="bi bi-x-circle-fill" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ BOTTOM ROW: Quote | Product ═══ */}
          <div className="enq-bottom-row">
            {/* ─── SECTION 4: QUOTE ────────────────────────────────────── */}
            <div
              className={`enq-form-card enq-section-quote${!quoteEnabled ? " enq-section-locked" : ""}`}
            >
              <div className="enq-section-title">
                <i className="bi bi-journal-bookmark me-2" />
                4. Quote
                {!quoteEnabled && (
                  <span className="enq-locked-badge ms-2">
                    <i className="bi bi-lock-fill" />
                  </span>
                )}
              </div>
              <div className="enq-form-group">
                <label>Quote Number</label>
                <input
                  className="form-control enq-readonly-field"
                  value="-"
                  readOnly
                  title="Auto-generated on Save"
                />
              </div>
              <div className="enq-form-group">
                <label>Register Date</label>
                <input
                  className="form-control enq-readonly-field"
                  value={today}
                  readOnly
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Stage <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Quotestage}
                  onChange={(e) => set("Quotestage", e.target.value)}
                  disabled={!quoteEnabled}
                >
                  <option value="Enquiry">Enquiry</option>
                </select>
              </div>
              <div className="enq-form-group">
                <label>Quote Submitted Date</label>
                <input
                  type="date"
                  className="form-control enq-readonly-field"
                  value=""
                  readOnly
                  disabled
                  style={{ background: "#f0f0f0" }}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Opportunity Stage <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Opportunitystage}
                  onChange={(e) => set("Opportunitystage", e.target.value)}
                  disabled={!quoteEnabled}
                >
                  <option value="">Select</option>
                  {oppStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>Revision</label>
                <input
                  className="form-control enq-readonly-field"
                  value="0"
                  readOnly
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Expected Order Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.Expectedorderdate}
                  min={today}
                  onChange={(e) => set("Expectedorderdate", e.target.value)}
                  disabled={!quoteEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>Effective Enquiry Date</label>
                <div className="d-flex gap-2 align-items-center">
                  <input
                    type="date"
                    className="form-control"
                    value={form.EffEnqDate}
                    min={effEnqMin}
                    max={effEnqMax}
                    onChange={(e) => set("EffEnqDate", e.target.value)}
                    disabled={!quoteEnabled || !form.effEnqOverride}
                    style={
                      !quoteEnabled || !form.effEnqOverride
                        ? { background: "#f0f0f0" }
                        : {}
                    }
                  />
                  <input
                    type="checkbox"
                    checked={form.effEnqOverride}
                    onChange={(e) => {
                      set("effEnqOverride", e.target.checked);
                      if (!e.target.checked) set("EffEnqDate", "");
                    }}
                    disabled={!quoteEnabled}
                    title="Enable Effective Enquiry Date"
                  />
                </div>
              </div>
              <div className="enq-form-group">
                <label>Priority</label>
                <select
                  className="form-select"
                  value={form.Priority}
                  onChange={(e) => set("Priority", e.target.value)}
                  disabled={!quoteEnabled}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            {/* ─── SECTION 3: PRODUCT ──────────────────────────────────── */}
            <div
              className={`enq-form-card enq-section-product${!productEnabled ? " enq-section-locked" : ""}`}
            >
              <div className="enq-section-title">
                <i className="bi bi-box-seam me-2" />
                3. Product
                {!productEnabled && (
                  <span className="enq-locked-badge ms-2">
                    <i className="bi bi-lock-fill" />
                  </span>
                )}
              </div>

              {/* Facing Factory + checkbox */}
              <div className="enq-form-group">
                <label>
                  Facing Factory <span className="req">*</span>
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select"
                    value={form.Facingfactory}
                    onChange={(e) => set("Facingfactory", e.target.value)}
                    disabled={!productEnabled}
                  >
                    <option value="">--Select--</option>
                    {facingFactories.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <input
                    type="checkbox"
                    title="Add new Facing Factory"
                    checked={showAddFF}
                    onChange={(e) => setShowAddFF(e.target.checked)}
                    disabled={!productEnabled}
                  />
                </div>
                {showAddFF && (
                  <div className="enq-dynamic-add mt-1">
                    <input
                      className="form-control form-control-sm"
                      placeholder="New factory..."
                      value={newFF}
                      onChange={(e) => setNewFF(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm enq-btn-submit ms-1"
                      onClick={handleAddFF}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary ms-1"
                      onClick={() => {
                        setShowAddFF(false);
                        setNewFF("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Product multi-select tags */}
              <div className="enq-form-group">
                <label>
                  Product <span className="req">*</span>
                </label>
                {!form.Facingfactory ? (
                  <div className="enq-product-empty-msg">
                    <i className="bi bi-arrow-up-circle me-2" />
                    Select a Facing Factory first
                  </div>
                ) : products.length === 0 ? (
                  <div className="enq-product-empty-msg">
                    <i className="bi bi-inbox me-2" />
                    No products found for this factory
                  </div>
                ) : (
                  <>
                    {/* Selected tags */}
                    {form.Product?.length > 0 && (
                      <div className="enq-product-tags mb-1">
                        {form.Product.map((p) => (
                          <span key={p} className="enq-product-tag">
                            {p}
                            <button
                              type="button"
                              onClick={() => toggleProduct(p)}
                            >
                              <i className="bi bi-x" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Dropdown list */}
                    <select
                      className="form-select"
                      size={Math.min(products.length, 6)}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) toggleProduct(e.target.value);
                      }}
                      disabled={!productEnabled}
                    >
                      {products.map((p) => (
                        <option
                          key={p.name}
                          value={p.name}
                          style={
                            form.Product?.includes(p.name)
                              ? {
                                  background: "#ffe8e8",
                                  color: "#800000",
                                  fontWeight: 600,
                                }
                              : {}
                          }
                        >
                          {form.Product?.includes(p.name) ? "✓ " : ""}
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <small
                      className="text-muted"
                      style={{ fontSize: "0.72rem" }}
                    >
                      Click to select/deselect. Selected:{" "}
                      {form.Product?.length || 0}
                    </small>
                  </>
                )}
              </div>

              <div className="enq-form-group">
                <label>
                  Project Name <span className="req">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.Projectname}
                  onChange={(e) => set("Projectname", e.target.value)}
                  placeholder="Enter Project Name..."
                  maxLength={75}
                  disabled={!productEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Customer Due Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.CustomerdueDate}
                  min={today}
                  onChange={(e) => set("CustomerdueDate", e.target.value)}
                  disabled={!productEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Proposed Due Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.ProposeddueDate}
                  min={today}
                  onChange={(e) => set("ProposeddueDate", e.target.value)}
                  disabled={!productEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Lines in RFQ <span className="req">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  value={form.Totallineitems}
                  onChange={(e) => set("Totallineitems", e.target.value)}
                  placeholder="Enter no. of lines"
                  disabled={!productEnabled}
                />
              </div>
              <div className="enq-form-group">
                <label>
                  Winning Probability <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Winprob}
                  onChange={(e) => set("Winprob", e.target.value)}
                  disabled={!productEnabled}
                >
                  <option value="">--Select--</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            </div>
          </div>

          {/* ═══ SAVE BUTTON ═══ */}
          <div className="enq-form-actions">
            <button
              type="button"
              className="btn enq-btn-reset"
              onClick={handleReset}
              disabled={submitting}
            >
              <i className="bi bi-arrow-counterclockwise me-1" />
              Reset
            </button>
            <button
              type="submit"
              className="btn enq-btn-submit"
              disabled={!saveEnabled || submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill me-1" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
