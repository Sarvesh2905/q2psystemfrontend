export const saveAuth = (token, user) => {
  localStorage.setItem("q2p_token", token);
  localStorage.setItem("q2p_user", JSON.stringify(user));
};

export const getAuth = () => {
  const token = localStorage.getItem("q2p_token");
  const user = JSON.parse(localStorage.getItem("q2p_user") || "null");
  return { token, user };
};

export const clearAuth = () => {
  localStorage.removeItem("q2p_token");
  localStorage.removeItem("q2p_user");
};

export const isLoggedIn = () => {
  const { token } = getAuth();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};
