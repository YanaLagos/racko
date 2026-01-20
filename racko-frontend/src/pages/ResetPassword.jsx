import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPasswordApi } from "../api/auth.api";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msgKey, setMsgKey] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsgKey("");

    if (password !== confirmPassword) {
      setMsgKey("errors.validation.passwordsDontMatch");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({ token, password });

      localStorage.removeItem("token");
      localStorage.removeItem("user"); 
      sessionStorage.clear();

      setMsgKey("success.auth.passwordUpdated");

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const key = err?.response?.data?.error || "errors.server.internal";
      setMsgKey(key);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="inicio">
        <h1>{t("reset.title")}</h1>
        <p>{t("reset.subtitle")}</p>

        <form onSubmit={onSubmit}>
          <div className="field-login">
            <label htmlFor="password">{t("login.password")}</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="field-login">
            <label htmlFor="confirmPassword">
              {t("reset.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading ? t("reset.loading") : t("reset.save")}
          </button>

          {msgKey && <p className="mt-10">{t(msgKey)}</p>}

          <div className="mt-10">
            <Link to="/login" className="link">
              {t("login.signIn")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
