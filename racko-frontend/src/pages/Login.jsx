import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import LanguageSwitch from "../components/common/LanguageSwitch";
import { useNavigate } from "react-router-dom";

import RackoLogo from "../assets/logo-racko.svg?react";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorKey("");
    setLoading(true);

    try {
      await login({ username, password });

      navigate("/", { replace: true });
    } catch (err) {
      const key = err?.response?.data?.error || "errors.server.internal";
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <LanguageSwitch />
      </div>
      <div className="racko-logo">
        <RackoLogo className="racko-logo-svg" />
      </div>
      <div className="inicio">
        <h1>{t("login.title")}</h1>
        <h2>{t("login.subtitle")}</h2>

        <form onSubmit={onSubmit}>
          <div className="field-login">
            <label htmlFor="username">{t("login.user")}</label>
            <input
              id="username"
              type="text"
              className="input-login"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field-login">
            <label htmlFor="password">{t("login.password")}</label>
            <input
              id="password"
              type="password"
              className="input-login"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="actions-login">
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? t("login.loading") : t("login.signIn")}
            </button>

            <div className="forgot-login">
              <Link to="/forgot-password" className="link-login">
                {t("login.forgot")}
              </Link>
            </div>
          </div>
          {errorKey && <p className="error mt-10">{t(errorKey)}</p>}
        </form>
      </div>
    </div>
  );
}
