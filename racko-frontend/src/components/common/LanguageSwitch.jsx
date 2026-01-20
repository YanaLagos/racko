import { useTranslation } from "react-i18next";

export default function LanguageSwitch() {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  const toggle = () => {
    i18n.changeLanguage(isEs ? "en" : "es");
  };

  return (
    <button type="button" className="lang-btn" onClick={toggle} aria-label="Cambiar idioma">
      <span className="flag">{isEs ? "🇨🇱" : "🇬🇧"}</span>
      <span className="lang-text">{isEs ? "Español" : "English"}</span>
    </button>
  );
}
