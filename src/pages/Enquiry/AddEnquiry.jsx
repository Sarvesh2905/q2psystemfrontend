// src/pages/Enquiry/AddEnquiry.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";

/* ════════════════════════════════════════
   PRODUCT VISUAL MAPPER
════════════════════════════════════════ */
const getProductVisual = (name) => {
  const n = (name || "").toLowerCase();

  if (n.includes("valve"))
    return { icon: "bi-gear-wide-connected", bg: "#e8f4fd", color: "#1565c0" };
  if (n.includes("pump"))
    return { icon: "bi-droplet-fill",         bg: "#e8f5e9", color: "#2e7d32" };
  if (n.includes("filter"))
    return { icon: "bi-funnel-fill",           bg: "#fff8e1", color: "#f57f17" };
  if (n.includes("pipe") || n.includes("tube"))
    return { icon: "bi-distribute-horizontal", bg: "#fce4ec", color: "#c62828" };
  if (n.includes("fitting") || n.includes("flange"))
    return { icon: "bi-wrench-adjustable",     bg: "#f3e5f5", color: "#6a1b9a" };
  if (n.includes("sensor") || n.includes("transmit"))
    return { icon: "bi-cpu-fill",              bg: "#e0f2f1", color: "#00695c" };
  if (n.includes("actuator") || n.includes("motor"))
    return { icon: "bi-lightning-charge-fill", bg: "#fff3e0", color: "#e65100" };
  if (n.includes("seal") || n.includes("gasket"))
    return { icon: "bi-circle-fill",           bg: "#fafafa", color: "#546e7a" };
  if (n.includes("gauge") || n.includes("meter") || n.includes("measure"))
    return { icon: "bi-speedometer2",          bg: "#e8eaf6", color: "#283593" };
  if (n.includes("heat") || n.includes("exchanger"))
    return { icon: "bi-thermometer-half",      bg: "#fbe9e7", color: "#bf360c" };
  if (n.includes("control") || n.includes("panel"))
    return { icon: "bi-toggles",               bg: "#e1f5fe", color: "#0277bd" };
  if (n.includes("cable") || n.includes("wire"))
    return { icon: "bi-ethernet",              bg: "#f9fbe7", color: "#827717" };
  if (n.includes("bolt") || n.includes("nut") || n.includes("screw"))
    return { icon: "bi-tools",                 bg: "#efebe9", color: "#4e342e" };
  if (n.includes("bearing"))
    return { icon: "bi-circle-half",           bg: "#e8eaf6", color: "#1a237e" };
  if (n.includes("reducer") || n.includes("gearbox"))
    return { icon: "bi-gear-fill",             bg: "#fafafa", color: "#37474f" };
  if (n.includes("strainer"))
    return { icon: "bi-grid-3x3-gap-fill",     bg: "#fff8e1", color: "#f57f17" };
  if (n.includes("pressure"))
    return { icon: "bi-speedometer",           bg: "#e8eaf6", color: "#283593" };
  if (n.includes("flow"))
    return { icon: "bi-water",                 bg: "#e1f5fe", color: "#0277bd" };
  if (n.includes("level"))
    return { icon: "bi-bar-chart-fill",        bg: "#e8f5e9", color: "#2e7d32" };
  if (n.includes("temp") || n.includes("therm"))
    return { icon: "bi-thermometer-sun",       bg: "#fbe9e7", color: "#bf360c" };
  if (n.includes("regulator"))
    return { icon: "bi-sliders",               bg: "#f3e5f5", color: "#6a1b9a" };
  if (n.includes("check"))
    return { icon: "bi-shield-check-fill",     bg: "#e8f5e9", color: "#2e7d32" };
  if (n.includes("relief") || n.includes("safety"))
    return { icon: "bi-exclamation-triangle-fill", bg: "#fff3e0", color: "#e65100" };

  // Default fallback
  return { icon: "bi-box-seam-fill",           bg: "#fff0f0", color: "#800000" };
};

export default function AddEnquiry() {
  const navigate = useNavigate();

  const getHeaders = () => {
    const { token } = getAuth();
    return { Authorization: `Bearer ${token}` };
  };

  const [customers,       setCustomers]       = useState([]);
  const [buyers,          setBuyers]          = useState([]);
  const [engineers,       setEngineers]       = useState([]);
  const [salesManagers,   setSalesManagers]   = useState([]);
  const [rfqTypes,        setRfqTypes]        = useState([]);
  const [rfqCategories,   setRfqCategories]   = useState([]);
  const [quoteStages,     setQuoteStages]     = useState([]);
  const [oppStages,       setOppStages]       = useState([]);
  const [endCountries,    setEndCountries]    = useState([]);
  const [industries,      setIndustries]      = useState([]);
  const [facingFactories, setFacingFactories] = useState([]);
  const [products,        setProducts]        = useState([]); // [{name, image, prdgroup}]

  const today = new Date().toISOString().split("T")[0];

  const INIT = {
    Customername: "", Customertype: "", CustomerCountry: "",
    Buyername: "", Groupname: "", Currency: "",
    Endusername: "", EndCountry: "", EndIndustry: "", EndUse: "",
    RFQDate: "", Deptuser: "", Salescontact: "",
    RFQType: "", RFQCategory: "", RFQreference: "", Comments: "",
    Facingfactory: "", Product: [],
    Totallineitems: "", CustomerdueDate: "", ProposeddueDate: "",
    Winprob: "", Priority: "Low", Projectname: "",
    Quotenumber: "", RFQREGDate: today,
    Quotestage: "", Opportunitystage: "",
    Quotesubmitteddate: "", Expectedorderdate: "",
    EffEnqDate: "", effEnqOverride: false,
  };

  const [form,       setForm]       = useState(INIT);
  const [submitting, setSubmitting] = useState(false);
  const [alert,      setAlert]      = useState({ msg: "", type: "" });

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  /* ── LOAD DROPDOWNS ── */
  useEffect(() => {
    const h = { headers: getHeaders() };
    const g = (url) => axios.get(`${API}/api/enquiry/${url}`, h);

    Promise.all([
      g("getcustomers"), g("getappengineers"), g("getsalesmanagers"),
      g("getrfqt"), g("getqt"), g("getqs"),
      g("getendcountries"), g("getindustries"), g("getff"),
    ]).then(([cust, eng, sales, rfqt, qt, qs, ec, ind, ff]) => {
      setCustomers(cust.data);
      setEngineers(eng.data);
      setSalesManagers(sales.data);
      setRfqTypes(rfqt.data);
      setRfqCategories(qt.data);
      setQuoteStages(qs.data);
      setEndCountries(ec.data);
      setIndustries(ind.data);
      setFacingFactories(ff.data);
    }).catch((err) => {
      console.error("Dropdown load error:", err);
      showAlert("Failed to load dropdown data.", "danger");
    });

    axios
      .get(`${API}/api/enquiry/fetchsno`, { headers: getHeaders() })
      .then((r) => setForm((f) => ({ ...f, Quotenumber: r.data.quoteNumber })))
      .catch(() => {});
  }, []); // eslint-disable-line

  /* ── CUSTOMER → auto-fill ── */
  useEffect(() => {
    if (!form.Customername) {
      setForm((f) => ({
        ...f,
        Customertype: "", CustomerCountry: "",
        Groupname: "", Currency: "", Buyername: "",
      }));
      setBuyers([]);
      return;
    }
    axios.get(`${API}/api/enquiry/getcustomerinfo`, {
      headers: getHeaders(),
      params: { customername: form.Customername },
    }).then((r) => {
      setForm((f) => ({
        ...f,
        Customertype:    r.data.custtype  || "",
        CustomerCountry: r.data.country   || "",
        Groupname:       r.data.location  || "",
        Currency:        r.data.currency  || "",
      }));
    }).catch(() => {});

    axios.get(`${API}/api/enquiry/getbuyers`, {
      headers: getHeaders(),
      params: { customer: form.Customername },
    }).then((r) => setBuyers(r.data)).catch(() => {});
  }, [form.Customername]); // eslint-disable-line

  /* ── END INDUSTRY → EndUse ── */
  useEffect(() => {
    if (!form.EndIndustry) {
      setForm((f) => ({ ...f, EndUse: "" }));
      return;
    }
    axios.get(`${API}/api/enquiry/getenduse`, {
      headers: getHeaders(),
      params: { endind: form.EndIndustry },
    }).then((r) => setForm((f) => ({ ...f, EndUse: r.data.enduse || "" })))
      .catch(() => {});
  }, [form.EndIndustry]); // eslint-disable-line

  /* ── FACING FACTORY → products [{name, image, prdgroup}] ── */
  useEffect(() => {
    const params = form.Facingfactory ? { facingfactory: form.Facingfactory } : {};
    axios.get(`${API}/api/enquiry/getproducts`, {
      headers: getHeaders(), params,
    }).then((r) => {
      setProducts(r.data);
      setForm((f) => ({ ...f, Product: [] }));
    }).catch(() => {});
  }, [form.Facingfactory]); // eslint-disable-line

  /* ── QUOTE STAGE → opp stages ── */
  useEffect(() => {
    if (!form.Quotestage) { setOppStages([]); return; }
    axios.get(`${API}/api/enquiry/getstatus`, {
      headers: getHeaders(),
      params: { quotestage: form.Quotestage },
    }).then((r) => setOppStages(r.data)).catch(() => {});
  }, [form.Quotestage]); // eslint-disable-line

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  /* ── PRODUCT TOGGLE (click to select / deselect) ── */
  const toggleProduct = (name) => {
    const current = Array.isArray(form.Product) ? form.Product : [];
    const updated = current.includes(name)
      ? current.filter((x) => x !== name)
      : [...current, name];
    setForm((f) => ({ ...f, Product: updated }));
  };

  /* ── SUBMIT ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.Customername)      return showAlert("Customer Name is required.", "warning");
    if (!form.Endusername)       return showAlert("End User Name is required.", "warning");
    if (!form.EndCountry)        return showAlert("End User Country is required.", "warning");
    if (!form.EndIndustry)       return showAlert("End Industry is required.", "warning");
    if (!form.RFQDate)           return showAlert("RFQ Receipt Date is required.", "warning");
    if (!form.Deptuser)          return showAlert("App. Engineer is required.", "warning");
    if (!form.Salescontact)      return showAlert("Sales Contact is required.", "warning");
    if (!form.RFQType)           return showAlert("Opportunity Type is required.", "warning");
    if (!form.RFQCategory)       return showAlert("Category is required.", "warning");
    if (!form.RFQreference)      return showAlert("RFQ Reference is required.", "warning");
    if (!form.Facingfactory)     return showAlert("Facing Factory is required.", "warning");
    if (!form.Product.length)    return showAlert("Please select at least one Product.", "warning");
    if (!form.Projectname)       return showAlert("Project Name is required.", "warning");
    if (!form.CustomerdueDate)   return showAlert("Customer Due Date is required.", "warning");
    if (!form.ProposeddueDate)   return showAlert("Proposed Due Date is required.", "warning");
    if (!form.Totallineitems)    return showAlert("Lines in RFQ is required.", "warning");
    if (Number(form.Totallineitems) < form.Product.length)
      return showAlert(
        `Lines in RFQ must be ≥ number of selected products (${form.Product.length}).`,
        "warning"
      );
    if (!form.Winprob)           return showAlert("Winning Probability is required.", "warning");
    if (!form.Opportunitystage)  return showAlert("Opportunity Stage is required.", "warning");
    if (!form.Expectedorderdate) return showAlert("Expected Order Date is required.", "warning");

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/enquiry/submit`,
        { ...form, RFQREGDate: today },
        { headers: getHeaders() }
      );
      showAlert("Enquiry registered successfully!", "success");
      setTimeout(() => navigate("/enquiry/register"), 1500);
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to submit enquiry.", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({ ...INIT });
    axios
      .get(`${API}/api/enquiry/fetchsno`, { headers: getHeaders() })
      .then((r) => setForm((f) => ({ ...f, Quotenumber: r.data.quoteNumber })))
      .catch(() => {});
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <>
      <DashboardNavbar />
      <div className="enq-wrapper">

        {/* ── Header ── */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button className="btn btn-sm back-btn" onClick={() => navigate("/enquiry")}>
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <h5 className="master-page-title mb-0">
            <i className="bi bi-plus-circle-fill me-2"></i>Add Enquiry
          </h5>
        </div>

        {/* ── Alert ── */}
        {alert.msg && (
          <div className={`alert alert-${alert.type} py-2 mb-3`}
            style={{ fontSize: "0.84rem" }}>
            {alert.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">

          {/* ══════════════════════════════
              SECTION 1 — CUSTOMER
          ══════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-building me-2"></i>1. Customer
            </div>
            <div className="enq-form-grid">

              <div className="enq-form-group">
                <label>Customer Name <span className="req">*</span></label>
                <select className="form-select" value={form.Customername}
                  onChange={(e) => set("Customername", e.target.value)}>
                  <option value="">— Select Customer —</option>
                  {customers.map((c) => (
                    <option key={c.customername} value={c.customername}>
                      {c.customername}
                    </option>
                  ))}
                </select>
              </div>

              <div className="enq-form-group">
                <label>Customer Category</label>
                <input className="form-control enq-readonly-field"
                  value={form.Customertype} readOnly placeholder="Auto-filled" />
              </div>

              <div className="enq-form-group">
                <label>Customer Country</label>
                <input className="form-control enq-readonly-field"
                  value={form.CustomerCountry} readOnly placeholder="Auto-filled" />
              </div>

              <div className="enq-form-group">
                <label>Buyer Name</label>
                <select className="form-select" value={form.Buyername}
                  onChange={(e) => set("Buyername", e.target.value)}
                  disabled={!form.Customername}>
                  <option value="">— Select Buyer —</option>
                  {buyers.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>Group</label>
                <input className="form-control enq-readonly-field"
                  value={form.Groupname} readOnly placeholder="Auto-filled" />
              </div>

              <div className="enq-form-group">
                <label>Currency</label>
                <input className="form-control enq-readonly-field"
                  value={form.Currency} readOnly placeholder="Auto-filled" />
              </div>

              <div className="enq-form-group">
                <label>End User Name <span className="req">*</span></label>
                <input className="form-control" value={form.Endusername}
                  onChange={(e) => set("Endusername", e.target.value)}
                  placeholder="Enter End User..." maxLength={50} />
              </div>

              <div className="enq-form-group">
                <label>End User Country <span className="req">*</span></label>
                <select className="form-select" value={form.EndCountry}
                  onChange={(e) => set("EndCountry", e.target.value)}>
                  <option value="">— Select —</option>
                  {endCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>End Industry <span className="req">*</span></label>
                <select className="form-select" value={form.EndIndustry}
                  onChange={(e) => set("EndIndustry", e.target.value)}>
                  <option value="">— Select Industry —</option>
                  {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>End Use</label>
                <textarea className="form-control enq-readonly-field" rows={2}
                  value={form.EndUse} readOnly placeholder="Auto-filled from industry" />
              </div>

            </div>
          </div>

          {/* ══════════════════════════════
              SECTION 2 — RFQ DETAILS
          ══════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-file-earmark-text me-2"></i>2. RFQ Details
            </div>
            <div className="enq-form-grid">

              <div className="enq-form-group">
                <label>RFQ Receipt Date <span className="req">*</span></label>
                <input type="date" className="form-control" value={form.RFQDate}
                  onChange={(e) => set("RFQDate", e.target.value)} max={today} />
              </div>

              <div className="enq-form-group">
                <label>App. Engineer <span className="req">*</span></label>
                <select className="form-select" value={form.Deptuser}
                  onChange={(e) => set("Deptuser", e.target.value)}>
                  <option value="">— Select Engineer —</option>
                  {engineers.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>Sales Contact <span className="req">*</span></label>
                <select className="form-select" value={form.Salescontact}
                  onChange={(e) => set("Salescontact", e.target.value)}>
                  <option value="">— Select Sales Contact —</option>
                  {salesManagers.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>Opportunity Type <span className="req">*</span></label>
                <div className="enq-custom-row">
                  <select className="form-select"
                    value={
                      rfqTypes.includes(form.RFQType)
                        ? form.RFQType
                        : form.RFQType ? "__custom__" : ""
                    }
                    onChange={(e) => {
                      if (e.target.value === "__custom__") set("RFQType", "");
                      else set("RFQType", e.target.value);
                    }}>
                    <option value="">— Select Type —</option>
                    {rfqTypes.map((r) => <option key={r} value={r}>{r}</option>)}
                    <option value="__custom__">+ Custom...</option>
                  </select>
                  {form.RFQType && !rfqTypes.includes(form.RFQType) && (
                    <input className="form-control mt-1"
                      placeholder="Enter custom type..."
                      value={form.RFQType}
                      onChange={(e) => set("RFQType", e.target.value)}
                      maxLength={45} />
                  )}
                </div>
              </div>

              <div className="enq-form-group">
                <label>Category <span className="req">*</span></label>
                <select className="form-select" value={form.RFQCategory}
                  onChange={(e) => set("RFQCategory", e.target.value)}>
                  <option value="">— Select Category —</option>
                  {rfqCategories.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="enq-form-group enq-form-group-full">
                <label>RFQ Reference <span className="req">*</span></label>
                <textarea className="form-control" rows={3} value={form.RFQreference}
                  onChange={(e) => set("RFQreference", e.target.value)}
                  placeholder="Enter RFQ Reference..." maxLength={250} />
              </div>

              <div className="enq-form-group enq-form-group-full">
                <label>Register Dt. Comments</label>
                <textarea className="form-control" rows={3} value={form.Comments}
                  onChange={(e) => set("Comments", e.target.value)}
                  placeholder="Your Comments Here..." maxLength={250} />
              </div>

            </div>
          </div>

          {/* ══════════════════════════════
              SECTION 3 — PRODUCT
          ══════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-box-seam me-2"></i>3. Product
            </div>
            <div className="enq-product-layout">

              {/* ── Left: fields + product picker ── */}
              <div className="enq-product-fields">
                <div className="enq-form-grid">

                  <div className="enq-form-group">
                    <label>Facing Factory <span className="req">*</span></label>
                    <select className="form-select" value={form.Facingfactory}
                      onChange={(e) => set("Facingfactory", e.target.value)}>
                      <option value="">— Select —</option>
                      {facingFactories.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="enq-form-group">
                    <label>Lines in RFQ <span className="req">*</span></label>
                    <input type="number" className="form-control" min={1}
                      value={form.Totallineitems}
                      onChange={(e) => set("Totallineitems", e.target.value)}
                      placeholder="Enter no. of lines" />
                  </div>

                  <div className="enq-form-group">
                    <label>Customer Due Date <span className="req">*</span></label>
                    <input type="date" className="form-control" value={form.CustomerdueDate}
                      onChange={(e) => set("CustomerdueDate", e.target.value)} />
                  </div>

                  <div className="enq-form-group">
                    <label>Proposed Due Date <span className="req">*</span></label>
                    <input type="date" className="form-control" value={form.ProposeddueDate}
                      onChange={(e) => set("ProposeddueDate", e.target.value)} />
                  </div>

                  <div className="enq-form-group">
                    <label>Winning Probability <span className="req">*</span></label>
                    <select className="form-select" value={form.Winprob}
                      onChange={(e) => set("Winprob", e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>

                  <div className="enq-form-group">
                    <label>Priority</label>
                    <select className="form-select" value={form.Priority}
                      onChange={(e) => set("Priority", e.target.value)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="enq-form-group enq-form-group-full">
                    <label>Project Name <span className="req">*</span></label>
                    <textarea className="form-control" rows={3} value={form.Projectname}
                      onChange={(e) => set("Projectname", e.target.value)}
                      placeholder="Enter Project Name..." maxLength={75} />
                  </div>

                  {/* ── PRODUCT CLICK CARDS ── */}
                  <div className="enq-form-group enq-form-group-full">
                    <label>
                      Product <span className="req">*</span>
                      <span className="enq-hint ms-2">(Click to select / deselect)</span>
                    </label>

                    {!form.Facingfactory ? (
                      <div className="enq-product-empty-msg">
                        <i className="bi bi-arrow-up-circle me-2"></i>
                        Select a Facing Factory first to see products
                      </div>
                    ) : products.length === 0 ? (
                      <div className="enq-product-empty-msg">
                        <i className="bi bi-inbox me-2"></i>
                        No products found for this factory
                      </div>
                    ) : (
                      <div className="enq-product-grid">
                        {products.map((p) => {
                          const isSelected = form.Product.includes(p.name);
                          const img = getProductVisual(p.name);
                          return (
                            <div
                              key={p.name}
                              className={`enq-product-card ${isSelected ? "enq-product-card--selected" : ""}`}
                              onClick={() => toggleProduct(p.name)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === "Enter" && toggleProduct(p.name)}
                            >
                              <div
                                className="enq-product-card-icon"
                                style={{
                                  background: img.bg,
                                  border: `1.5px solid ${img.color}33`,
                                }}
                              >
                                <i
                                  className={`bi ${img.icon}`}
                                  style={{ color: img.color, fontSize: "1rem" }}
                                ></i>
                              </div>
                              <div className="enq-product-card-text">
                                <span className="enq-product-card-name">{p.name}</span>
                                {p.prdgroup && (
                                  <span className="enq-product-card-group">{p.prdgroup}</span>
                                )}
                              </div>
                              {isSelected && (
                                <i className="bi bi-check-circle-fill enq-product-card-check"></i>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* ── Right: Selected Products panel ── */}
              <div className="enq-product-imgpanel">
                <div className="enq-imgpanel-title">
                  <i className="bi bi-check2-square me-1"></i>
                  Selected Products
                  {form.Product.length > 0 && (
                    <span className="enq-product-count">{form.Product.length}</span>
                  )}
                </div>

                {form.Product.length === 0 ? (
                  <div className="enq-imgpanel-empty">
                    <i className="bi bi-box-seam"
                      style={{ fontSize: "2.2rem", color: "#ddd" }}></i>
                    <p className="mb-0 mt-1"
                      style={{ fontSize: "0.76rem", color: "#bbb" }}>
                      No products selected
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "#ccc", margin: 0 }}>
                      Click a product to add
                    </p>
                  </div>
                ) : (
                  <div className="enq-imgpanel-cards">
                    {form.Product.map((prodName) => {
                      const img = getProductVisual(prodName);
                      return (
                        <div key={prodName} className="enq-imgpanel-card">
                          <div
                            className="enq-imgpanel-placeholder"
                            style={{
                              background: img.bg,
                              border: `1.5px solid ${img.color}33`,
                            }}
                          >
                            <i
                              className={`bi ${img.icon}`}
                              style={{ fontSize: "1.2rem", color: img.color }}
                            ></i>
                          </div>
                          <div className="enq-imgpanel-prodname">{prodName}</div>
                          <button
                            type="button"
                            className="enq-imgpanel-remove"
                            onClick={() => toggleProduct(prodName)}
                            title="Remove"
                          >
                            <i className="bi bi-x-circle-fill"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ══════════════════════════════
              SECTION 4 — QUOTE DETAILS
          ══════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-journal-bookmark me-2"></i>4. Quote Details
            </div>
            <div className="enq-form-grid">

              <div className="enq-form-group">
                <label>Quote Number</label>
                <input className="form-control enq-readonly-field"
                  value={form.Quotenumber} readOnly />
              </div>

              <div className="enq-form-group">
                <label>Register Date</label>
                <input className="form-control enq-readonly-field"
                  value={today} readOnly />
              </div>

              <div className="enq-form-group">
                <label>Quote Stage</label>
                <select className="form-select" value={form.Quotestage}
                  onChange={(e) => {
                    set("Quotestage", e.target.value);
                    set("Opportunitystage", "");
                  }}>
                  <option value="">— Select Stage —</option>
                  {quoteStages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>Opportunity Stage <span className="req">*</span></label>
                <select className="form-select" value={form.Opportunitystage}
                  onChange={(e) => set("Opportunitystage", e.target.value)}
                  disabled={!form.Quotestage}>
                  <option value="">— Select Opp. Stage —</option>
                  {oppStages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="enq-form-group">
                <label>Quote Submitted Date</label>
                <input type="date" className="form-control"
                  value={form.Quotesubmitteddate}
                  onChange={(e) => set("Quotesubmitteddate", e.target.value)}
                  disabled={form.Quotestage?.toLowerCase() === "enquiry"}
                  style={form.Quotestage?.toLowerCase() === "enquiry"
                    ? { background: "#f0f0f0" } : {}} />
              </div>

              <div className="enq-form-group">
                <label>Revision</label>
                <input className="form-control enq-readonly-field" value="0" readOnly />
              </div>

              <div className="enq-form-group">
                <label>Expected Order Date <span className="req">*</span></label>
                <input type="date" className="form-control"
                  value={form.Expectedorderdate}
                  onChange={(e) => set("Expectedorderdate", e.target.value)} />
              </div>

              <div className="enq-form-group">
                <label>Effective Enquiry Date</label>
                <div className="enq-custom-row">
                  <input type="date" className="form-control"
                    value={form.EffEnqDate}
                    onChange={(e) => set("EffEnqDate", e.target.value)}
                    disabled={!form.effEnqOverride}
                    style={!form.effEnqOverride ? { background: "#f0f0f0" } : {}} />
                  <input type="checkbox" className="ms-2"
                    checked={form.effEnqOverride}
                    onChange={(e) => {
                      set("effEnqOverride", e.target.checked);
                      if (!e.target.checked) set("EffEnqDate", "");
                    }}
                    title="Override Effective Enquiry Date" />
                </div>
              </div>

            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="enq-form-actions">
            <button type="button" className="btn enq-btn-reset"
              onClick={handleReset} disabled={submitting}>
              <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
            </button>
            <button type="submit" className="btn enq-btn-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill me-1"></i>
                  Register Enquiry
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}
