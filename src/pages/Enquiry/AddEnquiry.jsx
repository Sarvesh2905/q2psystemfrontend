import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";

export default function AddEnquiry() {
  const navigate = useNavigate();
  const { token } = getAuth();
  const headers = { Authorization: `Bearer ${token}` };

  /* ── dropdown lists ── */
  const [customers, setCustomers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [rfqTypes, setRfqTypes] = useState([]);
  const [rfqCategories, setRfqCategories] = useState([]);
  const [quoteStages, setQuoteStages] = useState([]);
  const [oppStages, setOppStages] = useState([]);
  const [endCountries, setEndCountries] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [facingFactories, setFacingFactories] = useState([]);
  const [products, setProducts] = useState([]);
  const [reasons, setReasons] = useState([]);

  /* ── form state ── */
  const today = new Date().toISOString().split("T")[0];

  const INIT = {
    // Section 1 — Customer
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
    // Section 2 — RFQ
    RFQDate: "",
    Deptuser: "",
    Salescontact: "",
    RFQType: "",
    RFQCategory: "",
    RFQreference: "",
    Comments: "",
    // Section 3 — Product
    Facingfactory: "",
    Product: [],
    Totallineitems: "",
    CustomerdueDate: "",
    ProposeddueDate: "",
    Winprob: "",
    Priority: "Low",
    Projectname: "",
    // Section 4 — Quote
    Quotenumber: "",
    RFQREGDate: today,
    Quotestage: "",
    Opportunitystage: "",
    Quotesubmitteddate: "",
    Expectedorderdate: "",
    EffEnqDate: "",
    effEnqOverride: false,
  };

  const [form, setForm] = useState(INIT);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ msg: "", type: "" });

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  /* ════════════════════════════════════════
     LOAD DROPDOWNS ON MOUNT
  ════════════════════════════════════════ */
  useEffect(() => {
    const g = (url) => axios.get(`${API}/api/enquiry/${url}`, { headers });
    Promise.all([
      g("getcustomers"),
      g("getappengineers"),
      g("getsalesmanagers"),
      g("getrfqt"),
      g("getqt"),
      g("getqs"),
      g("getendcountries"),
      g("getindustries"),
      g("getff"),
      g("getreasons"),
    ])
      .then(([cust, eng, sales, rfqt, qt, qs, ec, ind, ff, rsn]) => {
        setCustomers(cust.data);
        setEngineers(eng.data);
        setSalesManagers(sales.data);
        setRfqTypes(rfqt.data);
        setRfqCategories(qt.data);
        setQuoteStages(qs.data);
        setEndCountries(ec.data);
        setIndustries(ind.data);
        setFacingFactories(ff.data);
        setReasons(rsn.data);
      })
      .catch(() => showAlert("Failed to load dropdown data.", "danger"));

    // fetch quote number
    axios
      .get(`${API}/api/enquiry/fetchsno`, { headers })
      .then((r) => setForm((f) => ({ ...f, Quotenumber: r.data.quoteNumber })))
      .catch(() => {});
  }, []); // eslint-disable-line

  /* ════════════════════════════════════════
     CUSTOMER CHANGE → auto-fill
  ════════════════════════════════════════ */
  useEffect(() => {
    if (!form.Customername) {
      setForm((f) => ({
        ...f,
        Customertype: "",
        CustomerCountry: "",
        Groupname: "",
        Currency: "",
      }));
      setBuyers([]);
      return;
    }
    // get customer info
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
    // get buyers
    axios
      .get(`${API}/api/enquiry/getbuyers`, {
        headers,
        params: { customer: form.Customername },
      })
      .then((r) => setBuyers(r.data))
      .catch(() => {});
  }, [form.Customername]); // eslint-disable-line

  /* ════════════════════════════════════════
     END INDUSTRY CHANGE → auto-fill EndUse
  ════════════════════════════════════════ */
  useEffect(() => {
    if (!form.EndIndustry) {
      setForm((f) => ({ ...f, EndUse: "" }));
      return;
    }
    axios
      .get(`${API}/api/enquiry/getenduse`, {
        headers,
        params: { endind: form.EndIndustry },
      })
      .then((r) => setForm((f) => ({ ...f, EndUse: r.data.enduse || "" })))
      .catch(() => {});
  }, [form.EndIndustry]); // eslint-disable-line

  /* ════════════════════════════════════════
     FACING FACTORY CHANGE → filter products
  ════════════════════════════════════════ */
  useEffect(() => {
    const params = form.Facingfactory
      ? { facingfactory: form.Facingfactory }
      : {};
    axios
      .get(`${API}/api/enquiry/getproducts`, { headers, params })
      .then((r) => {
        setProducts(r.data);
        setForm((f) => ({ ...f, Product: [] }));
      })
      .catch(() => {});
  }, [form.Facingfactory]); // eslint-disable-line

  /* ════════════════════════════════════════
     QUOTE STAGE CHANGE → filter opp stages
  ════════════════════════════════════════ */
  useEffect(() => {
    if (!form.Quotestage) {
      setOppStages([]);
      return;
    }
    axios
      .get(`${API}/api/enquiry/getstatus`, {
        headers,
        params: { quotestage: form.Quotestage },
      })
      .then((r) => setOppStages(r.data))
      .catch(() => {});
  }, [form.Quotestage]); // eslint-disable-line

  /* ════════════════════════════════════════
     FIELD CHANGE HANDLER
  ════════════════════════════════════════ */
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  /* multi-select for Product */
  const handleProductSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    set("Product", selected);
  };

  /* ════════════════════════════════════════
     SUBMIT
  ════════════════════════════════════════ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.Customername ||
      !form.RFQDate ||
      !form.Deptuser ||
      !form.Salescontact
    )
      return showAlert("Please fill all required fields.", "warning");
    if (!form.Product.length)
      return showAlert("Please select at least one product.", "warning");

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/enquiry/submit`,
        { ...form, RFQREGDate: today },
        { headers },
      );
      showAlert("Enquiry registered successfully!", "success");
      setTimeout(() => navigate("/enquiry/register"), 1500);
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
    setForm({ ...INIT });
    axios
      .get(`${API}/api/enquiry/fetchsno`, { headers })
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
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/enquiry")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1"></i>Back
          </button>
          <h5 className="master-page-title mb-0">
            <i className="bi bi-plus-circle-fill me-2"></i>Add Enquiry
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
          {/* ══════════════════════════════════════
               SECTION 1 — CUSTOMER
          ══════════════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-building me-2"></i>1. Customer
            </div>
            <div className="enq-form-grid">
              {/* Customer Name */}
              <div className="enq-form-group">
                <label>
                  Customer Name <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Customername}
                  onChange={(e) => set("Customername", e.target.value)}
                  required
                >
                  <option value="">— Select Customer —</option>
                  {customers.map((c) => (
                    <option key={c.customername} value={c.customername}>
                      {c.customername}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Type — auto-filled */}
              <div className="enq-form-group">
                <label>Customer Category</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.Customertype}
                  readOnly
                  placeholder="Auto-filled"
                />
              </div>

              {/* Customer Country — auto-filled */}
              <div className="enq-form-group">
                <label>Customer Country</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.CustomerCountry}
                  readOnly
                  placeholder="Auto-filled"
                />
              </div>

              {/* Buyer Name */}
              <div className="enq-form-group">
                <label>Buyer Name</label>
                <select
                  className="form-select"
                  value={form.Buyername}
                  onChange={(e) => set("Buyername", e.target.value)}
                  disabled={!form.Customername}
                >
                  <option value="">— Select Buyer —</option>
                  {buyers.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Name — auto-filled */}
              <div className="enq-form-group">
                <label>Group</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.Groupname}
                  readOnly
                  placeholder="Auto-filled"
                />
              </div>

              {/* Currency — auto-filled */}
              <div className="enq-form-group">
                <label>Currency</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.Currency}
                  readOnly
                  placeholder="Auto-filled"
                />
              </div>

              {/* End User Name */}
              <div className="enq-form-group">
                <label>End User Name</label>
                <input
                  className="form-control"
                  value={form.Endusername}
                  onChange={(e) => set("Endusername", e.target.value)}
                  placeholder="Enter end user name"
                />
              </div>

              {/* End Country */}
              <div className="enq-form-group">
                <label>End User Country</label>
                <select
                  className="form-select"
                  value={form.EndCountry}
                  onChange={(e) => set("EndCountry", e.target.value)}
                >
                  <option value="">— Select Country —</option>
                  {endCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* End Industry */}
              <div className="enq-form-group">
                <label>End Industry</label>
                <select
                  className="form-select"
                  value={form.EndIndustry}
                  onChange={(e) => set("EndIndustry", e.target.value)}
                >
                  <option value="">— Select Industry —</option>
                  {industries.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>

              {/* End Use — auto-filled */}
              <div className="enq-form-group">
                <label>End Use</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.EndUse}
                  readOnly
                  placeholder="Auto-filled from industry"
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
               SECTION 2 — RFQ
          ══════════════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-file-earmark-text me-2"></i>2. RFQ Details
            </div>
            <div className="enq-form-grid">
              {/* RFQ Date */}
              <div className="enq-form-group">
                <label>
                  RFQ Receipt Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.RFQDate}
                  onChange={(e) => set("RFQDate", e.target.value)}
                  required
                />
              </div>

              {/* App Engineer */}
              <div className="enq-form-group">
                <label>
                  App. Engineer <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Deptuser}
                  onChange={(e) => set("Deptuser", e.target.value)}
                  required
                >
                  <option value="">— Select Engineer —</option>
                  {engineers.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sales Contact */}
              <div className="enq-form-group">
                <label>
                  Sales Contact <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.Salescontact}
                  onChange={(e) => set("Salescontact", e.target.value)}
                  required
                >
                  <option value="">— Select Sales Contact —</option>
                  {salesManagers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opportunity Type (RFQType) — custom allowed */}
              <div className="enq-form-group">
                <label>Opportunity Type</label>
                <div className="enq-custom-row">
                  <select
                    className="form-select"
                    value={
                      rfqTypes.includes(form.RFQType)
                        ? form.RFQType
                        : "__custom__"
                    }
                    onChange={(e) => {
                      if (e.target.value !== "__custom__")
                        set("RFQType", e.target.value);
                    }}
                  >
                    <option value="">— Select Type —</option>
                    {rfqTypes.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="__custom__">+ Custom...</option>
                  </select>
                  {(!rfqTypes.includes(form.RFQType) ||
                    form.RFQType === "") && (
                    <input
                      className="form-control"
                      placeholder="Type custom..."
                      value={
                        rfqTypes.includes(form.RFQType) ? "" : form.RFQType
                      }
                      onChange={(e) => set("RFQType", e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* RFQ Category */}
              <div className="enq-form-group">
                <label>Category</label>
                <select
                  className="form-select"
                  value={form.RFQCategory}
                  onChange={(e) => set("RFQCategory", e.target.value)}
                >
                  <option value="">— Select Category —</option>
                  {rfqCategories.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* RFQ Reference — full width */}
              <div className="enq-form-group enq-form-group-full">
                <label>RFQ Reference</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.RFQreference}
                  onChange={(e) => set("RFQreference", e.target.value)}
                  placeholder="Enter RFQ reference / description"
                  maxLength={250}
                />
              </div>

              {/* Comments — full width */}
              <div className="enq-form-group enq-form-group-full">
                <label>Register Date Comments</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.Comments}
                  onChange={(e) => set("Comments", e.target.value)}
                  placeholder="Enter comments"
                  maxLength={250}
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
               SECTION 3 — PRODUCT
          ══════════════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-box-seam me-2"></i>3. Product
            </div>

            <div className="enq-product-layout">
              <div className="enq-product-fields">
                <div className="enq-form-grid">
                  {/* Facing Factory */}
                  <div className="enq-form-group">
                    <label>Facing Factory</label>
                    <select
                      className="form-select"
                      value={form.Facingfactory}
                      onChange={(e) => set("Facingfactory", e.target.value)}
                    >
                      <option value="">— All Factories —</option>
                      {facingFactories.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lines in RFQ */}
                  <div className="enq-form-group">
                    <label>Lines in RFQ</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={form.Totallineitems}
                      onChange={(e) => set("Totallineitems", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  {/* Customer Due Date */}
                  <div className="enq-form-group">
                    <label>Customer Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.CustomerdueDate}
                      onChange={(e) => set("CustomerdueDate", e.target.value)}
                    />
                  </div>

                  {/* Proposed Due Date */}
                  <div className="enq-form-group">
                    <label>Proposed Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.ProposeddueDate}
                      onChange={(e) => set("ProposeddueDate", e.target.value)}
                    />
                  </div>

                  {/* Win Probability */}
                  <div className="enq-form-group">
                    <label>Win Probability</label>
                    <select
                      className="form-select"
                      value={form.Winprob}
                      onChange={(e) => set("Winprob", e.target.value)}
                    >
                      <option value="">— Select —</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="enq-form-group">
                    <label>Priority</label>
                    <select
                      className="form-select"
                      value={form.Priority}
                      onChange={(e) => set("Priority", e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  {/* Project Name — full width */}
                  <div className="enq-form-group enq-form-group-full">
                    <label>Project Name</label>
                    <input
                      className="form-control"
                      value={form.Projectname}
                      onChange={(e) => set("Projectname", e.target.value)}
                      placeholder="Enter project name"
                      maxLength={75}
                    />
                  </div>

                  {/* Product Multi-Select — full width */}
                  <div className="enq-form-group enq-form-group-full">
                    <label>
                      Products <span className="req">*</span>
                      <span className="enq-hint ms-2">
                        (Hold Ctrl / Cmd to select multiple)
                      </span>
                    </label>
                    <select
                      multiple
                      className="form-select enq-product-select"
                      value={form.Product}
                      onChange={handleProductSelect}
                    >
                      {products.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Product Image Panel */}
              <div className="enq-product-imgpanel">
                <div className="enq-imgpanel-title">
                  <i className="bi bi-images me-2"></i>Selected Products
                </div>
                {form.Product.length === 0 ? (
                  <div className="enq-imgpanel-empty">
                    <i
                      className="bi bi-box-seam"
                      style={{ fontSize: "2rem", color: "#ccc" }}
                    ></i>
                    <p className="mb-0" style={{ fontSize: "0.78rem" }}>
                      No products selected
                    </p>
                  </div>
                ) : (
                  <div className="enq-imgpanel-cards">
                    {form.Product.map((prod) => (
                      <div key={prod} className="enq-imgpanel-card">
                        <div className="enq-imgpanel-placeholder">
                          <i
                            className="bi bi-image text-muted"
                            style={{ fontSize: "1.4rem" }}
                          ></i>
                        </div>
                        <div className="enq-imgpanel-prodname">{prod}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
               SECTION 4 — QUOTE
          ══════════════════════════════════════ */}
          <div className="enq-form-card">
            <div className="enq-section-title">
              <i className="bi bi-journal-bookmark me-2"></i>4. Quote Details
            </div>
            <div className="enq-form-grid">
              {/* Quote Number — auto-generated readonly */}
              <div className="enq-form-group">
                <label>Quote Number</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.Quotenumber}
                  readOnly
                />
              </div>

              {/* Register Date — today readonly */}
              <div className="enq-form-group">
                <label>Register Date</label>
                <input
                  className="form-control enq-readonly-field"
                  value={today}
                  readOnly
                />
              </div>

              {/* Quote Stage */}
              <div className="enq-form-group">
                <label>Quote Stage</label>
                <select
                  className="form-select"
                  value={form.Quotestage}
                  onChange={(e) => {
                    set("Quotestage", e.target.value);
                    set("Opportunitystage", "");
                  }}
                >
                  <option value="">— Select Stage —</option>
                  {quoteStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opportunity Stage */}
              <div className="enq-form-group">
                <label>Opportunity Stage</label>
                <select
                  className="form-select"
                  value={form.Opportunitystage}
                  onChange={(e) => set("Opportunitystage", e.target.value)}
                  disabled={!form.Quotestage}
                >
                  <option value="">— Select Opp. Stage —</option>
                  {oppStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quote Submitted Date */}
              <div className="enq-form-group">
                <label>Quote Submitted Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.Quotesubmitteddate}
                  onChange={(e) => set("Quotesubmitteddate", e.target.value)}
                />
              </div>

              {/* Expected Order Date */}
              <div className="enq-form-group">
                <label>Expected Order Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.Expectedorderdate}
                  onChange={(e) => set("Expectedorderdate", e.target.value)}
                />
              </div>

              {/* Eff. Enquiry Date — with override toggle */}
              <div className="enq-form-group">
                <label>
                  Eff. Enquiry Date
                  <span className="enq-hint ms-2">(override)</span>
                </label>
                <div className="enq-custom-row">
                  <input
                    type="checkbox"
                    checked={form.effEnqOverride}
                    onChange={(e) => {
                      set("effEnqOverride", e.target.checked);
                      if (!e.target.checked) set("EffEnqDate", "");
                    }}
                    title="Override Eff. Enquiry Date"
                  />
                  <input
                    type="date"
                    className="form-control"
                    value={form.EffEnqDate}
                    onChange={(e) => set("EffEnqDate", e.target.value)}
                    disabled={!form.effEnqOverride}
                    style={
                      !form.effEnqOverride ? { background: "#f0f0f0" } : {}
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
               ACTION BUTTONS
          ══════════════════════════════════════ */}
          <div className="enq-form-actions">
            <button
              type="button"
              className="btn enq-btn-reset"
              onClick={handleReset}
              disabled={submitting}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
            </button>
            <button
              type="submit"
              className="btn enq-btn-submit"
              disabled={submitting}
            >
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
