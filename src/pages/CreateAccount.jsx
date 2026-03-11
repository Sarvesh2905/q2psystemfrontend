import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthNavbar from "../components/AuthNavbar";

const API = "http://localhost:5001/api/auth";

export default function CreateAccount() {
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    site: "",
    Firstname: "",
    Lastname: "",
    EmployeeID: "",
    Email: "",
    Role: "",
  });

  // UI state
  const [verifyClicked, setVerifyClicked] = useState(false); // locks username + verify btn
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false); // unlocks all fields
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Messages
  const [alert, setAlert] = useState({ msg: "", type: "" }); // type: success | danger | warning
  const [empIdError, setEmpIdError] = useState("");
  const [pwdMismatch, setPwdMismatch] = useState(false);

  const showAlert = (msg, type) => setAlert({ msg, type });
  const clearAlert = () => setAlert({ msg: "", type: "" });

  useEffect(() => {
    axios
      .get(`${API}/sites`)
      .then((res) => setSites(res.data))
      .catch(() => {});
  }, []);

  // Auto-fill Email from username
  useEffect(() => {
    setForm((f) => ({ ...f, Email: f.username }));
  }, [form.username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearAlert();
    setForm((f) => ({ ...f, [name]: value }));

    // Live password match check
    if (name === "confirmPassword" || name === "password") {
      const pwd = name === "password" ? value : form.password;
      const cpwd = name === "confirmPassword" ? value : form.confirmPassword;
      setPwdMismatch(cpwd.length > 0 && pwd !== cpwd);
    }
  };

  // ── Step 1: Verify Email ─────────────────────────────────────────────────
  const handleVerifyEmail = async () => {
    if (!form.username.trim())
      return showAlert("Please enter a username (email).", "warning");
    setLoading(true);
    try {
      // Check duplicate username
      const { data: check } = await axios.get(
        `${API}/check-username?username=${encodeURIComponent(form.username)}`,
      );
      if (check.exists) {
        showAlert(check.message, "danger");
        setLoading(false);
        return;
      }
      // Send OTP
      const { data: otpRes } = await axios.post(`${API}/send-otp`, {
        email: form.username,
      });
      if (otpRes.success) {
        setOtpSent(true);
        setVerifyClicked(true); // lock username field + verify button
        showAlert(otpRes.message, "success");
      } else {
        showAlert(otpRes.message || "Failed to send OTP.", "danger");
      }
    } catch {
      showAlert("Server error. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return showAlert("Please enter the OTP.", "warning");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/verify-otp`, {
        email: form.username,
        otp,
      });
      if (data.success) {
        setOtpVerified(true); // unlock all fields
        showAlert("Email verified! Fill in the remaining fields.", "success");
      } else {
        showAlert(data.message || "Invalid OTP. Try again.", "danger");
      }
    } catch {
      showAlert("Server error. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  // ── Employee ID uniqueness check (on blur) ───────────────────────────────
  const checkEmployeeId = async () => {
    if (!form.EmployeeID.trim()) return;
    try {
      const { data } = await axios.get(
        `${API}/check-employeeid?employeeid=${encodeURIComponent(form.EmployeeID)}`,
      );
      setEmpIdError(data.exists ? data.message : "");
    } catch {
      setEmpIdError("");
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAlert();

    if (!otpVerified)
      return showAlert("Please verify your email first.", "warning");

    // All fields mandatory check
    const {
      username,
      password,
      confirmPassword,
      site,
      Firstname,
      Lastname,
      EmployeeID,
      Role,
    } = form;
    if (
      !username ||
      !password ||
      !confirmPassword ||
      !site ||
      !Firstname ||
      !Lastname ||
      !EmployeeID ||
      !Role
    )
      return showAlert("All fields are mandatory.", "warning");

    if (password !== confirmPassword)
      return showAlert("Passwords do not match.", "danger");

    if (password.length < 8)
      return showAlert("Password must be at least 8 characters.", "danger");

    if (empIdError) return showAlert(empIdError, "danger");

    setLoading(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;

      const { data } = await axios.post(`${API}/register`, payload);
      if (data.success) {
        showAlert(
          "Account created successfully! Redirecting to login...",
          "success",
        );
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      }
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Registration failed. Try again.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  const locked = !otpVerified; // all fields except username are locked until OTP verified

  return (
    <>
      <AuthNavbar />
      <div
        className="d-flex justify-content-center align-items-start py-4"
        style={{ minHeight: "calc(100vh - 56px)" }}
      >
        <div className="auth-card" style={{ maxWidth: "500px" }}>
          <h4 className="text-center mb-3">Create Account</h4>

          {alert.msg && (
            <div
              className={`alert alert-${alert.type} py-2 text-center`}
              role="alert"
            >
              {alert.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" noValidate>
            {/* ── Username ──────────────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Username (Email) <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type="email"
                  name="username"
                  className="form-control"
                  placeholder="Enter your Email"
                  value={form.username}
                  onChange={handleChange}
                  disabled={verifyClicked}
                  required
                />
                <button
                  type="button"
                  className="btn btn-primary-custom"
                  onClick={handleVerifyEmail}
                  disabled={verifyClicked || loading}
                >
                  {loading && !otpSent ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : null}
                  Verify
                </button>
              </div>
            </div>

            {/* ── OTP Field (shown after Verify clicked) ───────────────── */}
            {otpSent && !otpVerified && (
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Enter OTP <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter the OTP sent to your email"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className="btn btn-primary-custom"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : null}
                    Verify OTP
                  </button>
                </div>
              </div>
            )}

            {/* ── Password ─────────────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  className="form-control"
                  placeholder="Enter your Password (min 8 chars)"
                  value={form.password}
                  onChange={handleChange}
                  disabled={locked}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  disabled={locked}
                >
                  <i
                    className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`}
                  ></i>
                </button>
              </div>
            </div>

            {/* ── Confirm Password ─────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Confirm Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  className="form-control"
                  placeholder="Confirm your Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={locked}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  disabled={locked}
                >
                  <i
                    className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`}
                  ></i>
                </button>
              </div>
              {pwdMismatch && (
                <small className="text-danger">
                  <i className="bi bi-exclamation-circle me-1"></i>Passwords do
                  not match!
                </small>
              )}
            </div>

            {/* ── Site ─────────────────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Site <span className="text-danger">*</span>
              </label>
              <select
                name="site"
                className="form-select"
                value={form.site}
                onChange={handleChange}
                disabled={locked}
                required
              >
                <option value="">-- Select Site --</option>
                {sites.map((s) => (
                  <option key={s.sitename} value={s.sitename}>
                    {s.sitename}
                  </option>
                ))}
              </select>
            </div>

            {/* ── First Name ───────────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                First Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="Firstname"
                className="form-control"
                placeholder="Enter your First Name"
                value={form.Firstname}
                onChange={handleChange}
                disabled={locked}
                required
              />
            </div>

            {/* ── Last Name ────────────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Last Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="Lastname"
                className="form-control"
                placeholder="Enter your Last Name"
                value={form.Lastname}
                onChange={handleChange}
                disabled={locked}
                required
              />
            </div>

            {/* ── Employee ID ──────────────────────────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Employee ID <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="EmployeeID"
                className="form-control"
                placeholder="Enter your Employee ID"
                value={form.EmployeeID}
                onChange={handleChange}
                onBlur={checkEmployeeId}
                disabled={locked}
                required
              />
              {empIdError && (
                <small className="text-danger">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {empIdError}
                </small>
              )}
            </div>

            {/* ── Email (auto-filled, read-only) ───────────────────────── */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                name="Email"
                className="form-control readonly-field"
                value={form.Email}
                readOnly
                tabIndex={-1}
              />
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>Auto-filled from
                Username
              </small>
            </div>

            {/* ── Role ─────────────────────────────────────────────────── */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Role <span className="text-danger">*</span>
              </label>
              <select
                name="Role"
                className="form-select"
                value={form.Role}
                onChange={handleChange}
                disabled={locked}
                required
              >
                <option value="">-- Select Role --</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
                <option value="View Only">View Only</option>
              </select>
            </div>

            {/* ── Action Buttons ───────────────────────────────────────── */}
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary-custom flex-fill"
                disabled={!otpVerified || loading || pwdMismatch}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2"></span>
                ) : null}
                Create Account
              </button>
              <button
                type="button"
                className="btn btn-outline-custom flex-fill"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
