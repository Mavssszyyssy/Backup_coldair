import {
  ArrowLeft,
  ArrowSquareOut,
  CalendarBlank,
  CaretRight,
  EnvelopeSimple,
  FileText,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import coldAirLogo from "../common/images/Cold Air Logo.jpg";
import { COMPANY_CONTACT } from "../../config/company";
import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
import {
  getLegalPolicy,
  LEGAL_LAST_UPDATED,
  LEGAL_POLICY_LIST,
} from "../../domain/legalPolicies";
import "./LegalPolicyPage.css";

export default function LegalPolicyPage({ policyId }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const navigate = useNavigate();
  const location = useLocation();
  const policy = getLegalPolicy(policyId);

  useEffect(() => {
    if (!policy) return undefined;

    const previousTitle = document.title;
    document.title = `${t(policy.title)} | Cold Air ACT`;

    if (location.hash) {
      const sectionId = decodeURIComponent(location.hash.slice(1));
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    return () => {
      document.title = previousTitle;
    };
  }, [location.hash, policy, currentLanguage]);

  if (!policy) return null;

  const handleBack = () => {
    navigate("/register", { replace: true });
  };

  return (
    <div className="legal-page">
      <a className="legal-skip-link" href="#legal-document">
        {t("Skip to document")}
      </a>

      <header className="legal-header">
        <div className="legal-header__inner">
          <Link className="legal-brand" to="/shop" aria-label={t("Cold Air ACT shop")}>
            <img src={coldAirLogo} alt="" />
            <span>
              <strong>Cold Air ACT</strong>
              <small>{t("Legal center")}</small>
            </span>
          </Link>

          <button className="legal-back-button" type="button" onClick={handleBack}>
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            {t("Back to sign up")}
          </button>
        </div>
      </header>

      <main className="legal-main" id="legal-document">
        <nav className="legal-policy-tabs" aria-label={t("Legal documents")}>
          {LEGAL_POLICY_LIST.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={item.id === policy.id ? "is-active" : ""}
              aria-current={item.id === policy.id ? "page" : undefined}
            >
              {t(item.shortTitle)}
            </Link>
          ))}
        </nav>

        <article className="legal-document">
          <header className="legal-document__header">
            <div className="legal-document__category">
              {policy.id === "privacy" ? (
                <ShieldCheck size={18} weight="fill" aria-hidden="true" />
              ) : (
                <FileText size={18} weight="fill" aria-hidden="true" />
              )}
              {t(policy.category)}
            </div>
            <h1>{t(policy.title)}</h1>
            <p className="legal-document__summary">{policy.summary}</p>
            <div className="legal-document__meta">
              <CalendarBlank size={18} aria-hidden="true" />
              {t("Effective and last updated:")} {LEGAL_LAST_UPDATED}
            </div>
          </header>

          <div className="legal-notice" role="note">
            <ShieldCheck size={24} weight="fill" aria-hidden="true" />
            <p>{policy.notice}</p>
          </div>

          <div className="legal-document__layout">
            <aside className="legal-toc" aria-label={t("On this page")}>
              <p>{t("On this page")}</p>
              <ol>
                {policy.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>
                      <CaretRight size={13} weight="bold" aria-hidden="true" />
                      <span>{section.title.replace(/^\d+\.\s*/, "")}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="legal-sections">
              {policy.sections.map((section) => (
                <section id={section.id} key={section.id}>
                  <h2>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets?.length ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.links?.length ? (
                    <div className="legal-resources" aria-label={t("Official resources")}>
                      {section.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                        >
                          {link.label}
                          <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </article>

        <section className="legal-help" aria-labelledby="legal-help-title">
          <div>
            <EnvelopeSimple size={25} weight="fill" aria-hidden="true" />
            <div>
              <h2 id="legal-help-title">{t("Need clarification?")}</h2>
              <p>{t("Contact Cold Air ACT before accepting a term you do not understand.")}</p>
            </div>
          </div>
          <a href={`mailto:${COMPANY_CONTACT.supportEmail}`}>
            {COMPANY_CONTACT.supportEmail}
          </a>
        </section>
      </main>

      <footer className="legal-footer">
        <p>© {new Date().getFullYear()} Cold Air ACT. {t("All rights reserved.")}</p>
        <nav aria-label={t("Legal footer")}>
          {LEGAL_POLICY_LIST.map((item) => (
            <Link key={item.id} to={item.path}>
              {t(item.shortTitle)}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
