import { useState } from "react";
import { useTranslation } from "react-i18next";
import { forgotPasswordApi } from "../api/auth.api";

export default function ForgotPassword() {
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [msgKey, setMsgKey] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsgKey("");
    setLoading(true);

    try {
      await forgotPasswordApi({ username, email });
      setMsgKey("success.auth.resetRequested");
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
        <h1>{t("forgot.title")}</h1>
        <p>{t("forgot.subtitle")}</p>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">{t("login.user")}</label>
            <input
              id="username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">{t("forgot.email")}</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? t("forgot.loading") : t("forgot.send")}
          </button>

          {msgKey && <p className="mt-10">{t(msgKey)}</p>}
        </form>
      </div>
    </div>
  );
}
