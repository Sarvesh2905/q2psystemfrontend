import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DashboardNavbar from "../../components/DashboardNavbar";
import { getAuth } from "../../utils/auth";
import "./enquiry.css";

const API = "http://localhost:5001";

function toInputDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
}

function isMoreThan4WorkingDaysAgo(dateStr) {
  if (!dateStr) return false;
  const rfq = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  let d = new Date(rfq);
  while (d < today) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count > 4;
}

const today = toInputDate(new Date());

export default function EditEnquiry() {
  const { quotenumber } = useParams();
  const navigate = useNavigate();
  const token = getAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // Dropdowns
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

  // Dynamic add
  const [showAddFF, setShowAddFF] = useState(false);
  const [newFF, setNewFF] = useState("");
  const [showAddOT, setShowAddOT] = useState(false);
  const [newOT, setNewOT] = useState("");

  // Page state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [ffBootstrapped, setFfBootstrapped] = useState(false);
  const [custBootstrapped, setCustBootstrapped] = useState(false);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "" }), 4500);
  };

  const [form, setForm] = useState({
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
    RFQDate: "",
    Deptuser: "",
    Salescontact: "",
    RFQType: "",
    RFQCategory: "",
    RFQreference: "",
    Comments: "",
    Facingfactory: "",
    Product: [],
    Projectname: "",
    CustomerdueDate: "",
    ProposeddueDate: "",
    Totallineitems: "",
    Winprob: "",
    Quotenumber: "",
    RFQREGDate: "",
    Quotestage: "",
    Opportunitystage: "",
    Quotesubmitteddate: "",
    Expectedorderdate: "",
    EffEnqDate: "",
    effEnqOverride: false,
    Priority: "Low",
    Reason: "",
    RevisedDate: "",
    rev: 0,
    originalStage: "",
  });

  // Load all data
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
      axios.get(`${API}/api/enquiry/${encodeURIComponent(quotenumber)}`, {
        headers,
      }),
    ])
      .then(([cust, eng, sales, rfqt, qt, qs, ec, ind, ff, rsn, rec]) => {
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

        const r = rec.data;
        const prodArr = r.Product
          ? r.Product.split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [];

        setForm({
          Customername: r.Customername || "",
          Customertype: r.Customertype || "",
          CustomerCountry: r.CustomerCountry || "",
          Buyername: r.Buyername || "",
          Groupname: r.Groupname || "",
          Currency: r.Currency || "",
          Endusername: r.Endusername || "",
          EndCountry: r.EndCountry || "",
          EndIndustry: r.EndIndustry || "",
          EndUse: "",
          RFQDate: toInputDate(r.RFQDate),
          Deptuser: r.Deptuser || "",
          Salescontact: r.Salescontact || "",
          RFQType: r.RFQType || "",
          RFQCategory: r.RFQCategory || "",
          RFQreference: r.RFQreference || "",
          Comments: r.Comments || "",
          Facingfactory: r.Facingfactory || "",
          Product: prodArr,
          Projectname: r.Projectname || "",
          CustomerdueDate: toInputDate(r.CustomerdueDate),
          ProposeddueDate: toInputDate(r.ProposeddueDate),
          Totallineitems: r.Totallineitems || "",
          Winprob: r.Winprob || "",
          Quotenumber: r.Quotenumber || "",
          RFQREGDate: toInputDate(r.RFQREGDate),
          Quotestage: r.Quotestage || "",
          Opportunitystage: r.Opportunitystage || "",
          Quotesubmitteddate: toInputDate(r.Quotesubmitteddate),
          Expectedorderdate: toInputDate(r.Expectedorderdate),
          EffEnqDate: toInputDate(r.EffEnqDate),
          effEnqOverride: !!r.EffEnqDate,
          Priority: r.Priority || "Low",
          Reason: r.Reason || "",
          RevisedDate: toInputDate(r.RevisedDate),
          rev: r.Rev || 0,
          originalStage: r.Quotestage || "",
        });
        setLoading(false);
      })
      .catch(() => {
        showAlert("Failed to load enquiry data.", "danger");
        setLoading(false);
      });
  }, []); // eslint-disable-line

  // Customer change → auto-fill (skip on bootstrap)
  useEffect(() => {
    if (!form.Customername) return;
    if (!custBootstrapped) {
      axios
        .get(`${API}/api/enquiry/getbuyers`, {
          headers,
          params: { customer: form.Customername },
        })
        .then((r) => setBuyers(r.data))
        .catch(() => {});
      setCustBootstrapped(true);
      return;
    }
    axios
      .get(`${API}/api/enquiry/getcustomerinfo`, {
        headers,
        params: { customername: form.Customername },
      })
      .then((r) =>
        setForm((f) => ({
          ...f,
          Customertype: r.data.custtype || "",
          CustomerCountry: r.data.country || "",
          Groupname: r.data.location || "",
          Currency: r.data.currency || "",
        })),
      )
      .catch(() => {});
    axios
      .get(`${API}/api/enquiry/getbuyers`, {
        headers,
        params: { customer: form.Customername },
      })
      .then((r) => setBuyers(r.data))
      .catch(() => {});
  }, [form.Customername]); // eslint-disable-line

  // End industry → description
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

  // Facing factory → products (with bootstrap guard)
  useEffect(() => {
    if (!form.Facingfactory) {
      setProducts([]);
      return;
    }
    const params = { facingfactory: form.Facingfactory };
    if (!ffBootstrapped) {
      axios
        .get(`${API}/api/enquiry/getproducts`, { headers, params })
        .then((r) => setProducts(r.data))
        .catch(() => {});
      setFfBootstrapped(true);
      return;
    }
    axios
      .get(`${API}/api/enquiry/getproducts`, { headers, params })
      .then((r) => {
        setProducts(r.data);
        setForm((f) => ({ ...f, Product: [] }));
      })
      .catch(() => {});
  }, [form.Facingfactory]); // eslint-disable-line

  // Quote stage → opp stages
  useEffect(() => {
    if (!form.Quotestage) return;
    axios
      .get(`${API}/api/enquiry/getstatus`, {
        headers,
        params: { quotestage: form.Quotestage },
      })
      .then((r) => setOppStages(r.data))
      .catch(() => {});
  }, [form.Quotestage]); // eslint-disable-line

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
      showAlert(err.response?.data?.message || "Failed.", "danger");
    }
  };

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
      showAlert(err.response?.data?.message || "Failed.", "danger");
    }
  };

  const commentsEnabled = isMoreThan4WorkingDaysAgo(form.RFQDate);
  const effEnqMin = form.RFQDate || today;
  const effEnqMax = form.RFQREGDate || today;

  // Show reason field when stage changes to regret/cancelled
  const showReason = ["REGRET", "CANCELLED"].includes(
    form.Quotestage?.toUpperCase(),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Customername || !form.RFQDate || !form.Facingfactory)
      return showAlert("Please fill all required fields.", "warning");
    setSubmitting(true);
    try {
      await axios.put(
        `${API}/api/enquiry/${encodeURIComponent(form.Quotenumber)}`,
        { ...form, revision: form.rev },
        { headers },
      );
      showAlert("Enquiry updated successfully!", "success");
      setTimeout(() => navigate("/enquiry/register"), 1500);
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to update.", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <>
        <DashboardNavbar />
        <div className="enq-loading mt-5 ms-4">
          <span className="spinner-border spinner-border-sm me-2" />
          Loading enquiry...
        </div>
      </>
    );

  return (
    <>
      <DashboardNavbar />
      <div className="enq-wrapper">
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <button
            className="btn btn-sm back-btn"
            onClick={() => navigate("/enquiry/register")}
          >
            <i className="bi bi-arrow-left-circle-fill me-1" />
            Back
          </button>
          <h5 className="master-page-title mb-0">
            <i className="bi bi-pencil-fill me-2" />
            Modify Enquiry
          </h5>
          <span
            className="ms-2"
            style={{ color: "#800000", fontWeight: 700, fontSize: "0.95rem" }}
          >
            — {form.Quotenumber}
          </span>
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
          {/* ═══ TOP ROW ═══ */}
          <div className="enq-top-row">
            {/* ─── 1. CUSTOMER ─── */}
            <div className="enq-form-card">
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
                />
              </div>
              <div className="enq-form-group">
                <label>Customer Country</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.CustomerCountry}
                  readOnly
                />
              </div>
              <div className="enq-form-group">
                <label>Buyer Name</label>
                <select
                  className="form-select"
                  value={form.Buyername}
                  onChange={(e) => set("Buyername", e.target.value)}
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
                  />
                </div>
                <div className="enq-form-group">
                  <label>Currency</label>
                  <input
                    className="form-control enq-readonly-field"
                    value={form.Currency}
                    readOnly
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

            {/* ─── 2. RFQ ─── */}
            <div className="enq-form-card">
              <div className="enq-section-title">
                <i className="bi bi-file-earmark-text me-2" />
                2. RFQ
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
                >
                  <option value="">Select</option>
                  {salesManagers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>
                  Opportunity Type <span className="req">*</span>
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select"
                    value={form.RFQType}
                    onChange={(e) => set("RFQType", e.target.value)}
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
                    checked={showAddOT}
                    onChange={(e) => setShowAddOT(e.target.checked)}
                    title="Add new type"
                  />
                </div>
                {showAddOT && (
                  <div className="enq-dynamic-add">
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
                      ✕
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
                  maxLength={250}
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
                  disabled={!commentsEnabled}
                  style={!commentsEnabled ? { background: "#f0f0f0" } : {}}
                />
              </div>
            </div>

            {/* ─── Image Panel ─── */}
            <div className="enq-imgpanel-outer">
              <div className="enq-imgpanel-logo">
                <div
                  style={{
                    color: "#800000",
                    fontWeight: 700,
                    fontSize: "1.5rem",
                    letterSpacing: 2,
                  }}
                >
                  CIRCOR
                </div>
                <div style={{ color: "#aaa", fontSize: "0.75rem" }}>
                  Product Preview
                </div>
              </div>
              {!form.Product?.length ? (
                <div className="enq-imgpanel-empty mt-3">
                  <i
                    className="bi bi-box-seam"
                    style={{ fontSize: "2rem", color: "#ddd" }}
                  />
                  <p style={{ fontSize: "0.76rem", color: "#bbb", margin: 0 }}>
                    No products selected
                  </p>
                </div>
              ) : (
                <div className="enq-imgpanel-cards">
                  {form.Product.map((p) => (
                    <div key={p} className="enq-imgpanel-card">
                      <div className="enq-imgpanel-placeholder">
                        <i
                          className="bi bi-image text-muted"
                          style={{ fontSize: "1.2rem" }}
                        />
                      </div>
                      <div className="enq-imgpanel-prodname">{p}</div>
                      <button
                        type="button"
                        className="enq-imgpanel-remove"
                        onClick={() => toggleProduct(p)}
                      >
                        <i className="bi bi-x-circle-fill" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ BOTTOM ROW ═══ */}
          <div className="enq-bottom-row">
            {/* ─── 4. QUOTE ─── */}
            <div className="enq-form-card">
              <div className="enq-section-title">
                <i className="bi bi-journal-bookmark me-2" />
                4. Quote
              </div>
              <div className="enq-form-group">
                <label>Quote Number</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.Quotenumber}
                  readOnly
                />
              </div>
              <div className="enq-form-group">
                <label>Register Date</label>
                <input
                  className="form-control enq-readonly-field"
                  value={form.RFQREGDate || today}
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
                >
                  <option value="">Select</option>
                  {quoteStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enq-form-group">
                <label>Quote Submitted Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.Quotesubmitteddate}
                  onChange={(e) => set("Quotesubmitteddate", e.target.value)}
                  disabled={form.Quotestage?.toLowerCase() === "enquiry"}
                  style={
                    form.Quotestage?.toLowerCase() === "enquiry"
                      ? { background: "#f0f0f0" }
                      : {}
                  }
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
                  value={form.rev ?? 0}
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
                    disabled={!form.effEnqOverride}
                    style={
                      !form.effEnqOverride ? { background: "#f0f0f0" } : {}
                    }
                  />
                  <input
                    type="checkbox"
                    checked={form.effEnqOverride}
                    onChange={(e) => {
                      set("effEnqOverride", e.target.checked);
                      if (!e.target.checked) set("EffEnqDate", "");
                    }}
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
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              {/* Reason — shown when stage is Regret/Cancelled */}
              {showReason && (
                <div className="enq-reason-card mt-2">
                  <div className="enq-form-group mb-0">
                    <label>
                      Reason Code <span className="req">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={form.Reason}
                      onChange={(e) => set("Reason", e.target.value)}
                    >
                      <option value="">Select Reason</option>
                      {reasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ─── 3. PRODUCT ─── */}
            <div className="enq-form-card">
              <div className="enq-section-title">
                <i className="bi bi-box-seam me-2" />
                3. Product
              </div>
              <div className="enq-form-group">
                <label>
                  Facing Factory <span className="req">*</span>
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select"
                    value={form.Facingfactory}
                    onChange={(e) => set("Facingfactory", e.target.value)}
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
                    checked={showAddFF}
                    onChange={(e) => setShowAddFF(e.target.checked)}
                    title="Add new factory"
                  />
                </div>
                {showAddFF && (
                  <div className="enq-dynamic-add">
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
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div className="enq-form-group">
                <label>
                  Product <span className="req">*</span>
                </label>
                {!form.Facingfactory ? (
                  <div className="enq-product-empty-msg">
                    Select a Facing Factory first
                  </div>
                ) : products.length === 0 ? (
                  <div className="enq-product-empty-msg">
                    No products found for this factory
                  </div>
                ) : (
                  <>
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
                    <select
                      className="form-select"
                      size={Math.min(products.length, 6)}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) toggleProduct(e.target.value);
                      }}
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
                  maxLength={75}
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
                >
                  <option value="">--Select--</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="enq-form-actions">
            <button
              type="button"
              className="btn enq-btn-reset"
              onClick={() => navigate("/enquiry/register")}
              disabled={submitting}
            >
              <i className="bi bi-x-circle me-1" />
              Cancel
            </button>
            <button
              type="submit"
              className="btn enq-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill me-1" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
