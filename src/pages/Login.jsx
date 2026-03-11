import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthNavbar from "../components/AuthNavbar";
import { saveAuth, isLoggedIn } from "../utils/auth";

const API = "http://localhost:5001/api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", site: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) navigate("/dashboard", { replace: true });
  }, []);

  // Fetch sites on mount
  useEffect(() => {
    axios
      .get(`${API}/sites`)
      .then((res) => setSites(res.data))
      .catch(() => setError("Could not load sites. Please refresh."));
  }, []);

  const handleChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Frontend mandatory check (backup to HTML required)
    if (!form.username.trim() || !form.password.trim() || !form.site)
      return setError("All fields are required.");

    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/login`, form);
      saveAuth(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthNavbar />
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "calc(100vh - 56px)" }}
      >
        <div className="auth-card">
          <h4 className="text-center mb-4">Login</h4>

          {error && (
            <div className="alert alert-danger py-2 text-center" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" noValidate>
            {/* Username */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Username <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="username"
                className="form-control"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  <i
                    className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`}
                  ></i>
                </button>
              </div>
            </div>

            {/* Site */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Site <span className="text-danger">*</span>
              </label>
              <select
                name="site"
                className="form-select"
                value={form.site}
                onChange={handleChange}
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

            {/* Buttons */}
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary-custom flex-fill"
                disabled={loading}
              >
                {loading && (
                  <span className="spinner-border spinner-border-sm me-2"></span>
                )}
                Login
              </button>
              <button
                type="button"
                className="btn btn-outline-custom flex-fill"
                onClick={() => navigate("/create-account")}
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
