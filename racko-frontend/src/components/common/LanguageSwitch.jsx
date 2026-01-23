import { useTranslation } from "react-i18next";
import EsFlag from "../../assets/chile-flag.svg?react";
import EnFlag from "../../assets/united-states-flag.svg?react";

export default function LanguageSwitch() {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  const toggle = () => {
    i18n.changeLanguage(isEs ? "en" : "es");
  };

  return (
    <button
      type="button"
      className="lang-btn"
      onClick={toggle}
      aria-label="Cambiar idioma"
    >
      {isEs ? (
        <EsFlag className="lang-flag" />
      ) : (
        <EnFlag className="lang-flag" />
      )}

      <span className="lang-text">{isEs ? "Español" : "English"}</span>
    </button>
  );
}
