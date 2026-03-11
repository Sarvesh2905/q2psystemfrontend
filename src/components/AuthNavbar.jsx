export default function AuthNavbar() {
  return (
    <nav className="auth-navbar">
      <span className="brand-left">CircorFlow</span>
      <span className="brand-center">Q2P System</span>
      {/* spacer to balance flex */}
      <span style={{ minWidth: "140px" }}></span>
    </nav>
  );
}
