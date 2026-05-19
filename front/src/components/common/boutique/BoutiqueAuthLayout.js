import RegisterBrandSection from "../../register/RegisterBrandSection";
import BoutiqueBox from "./BoutiqueBox";
import { BQ_COLORS } from "./BoutiqueTheme";

/**
 * BOUTIQUE AUTH LAYOUT
 * Unified layout for Login and Registration.
 * Handles the 50/50 flex split and mobile vertical stacking.
 */
export default function BoutiqueAuthLayout({ children }) {
  return (
    <BoutiqueBox className="bq-auth-layout" width="100%" height="100vh">
      <BoutiqueBox
        className="bq-auth-flex"
        direction="row"
        flex={1}
        width="100%"
      >
        {/* BRAND PANEL AREA */}
        <BoutiqueBox
          className="bq-auth-brand-area"
          flex={1}
          background={BQ_COLORS.brand}
        >
          <RegisterBrandSection />
        </BoutiqueBox>

        {/* FORM PANEL AREA */}
        <BoutiqueBox
          className="bq-auth-form-area"
          flex={1}
          background="white"
          align="center"
          style={{ overflowY: "auto" }}
        >
          <BoutiqueBox
            className="bq-auth-form-constraint"
            width="100%"
            height="100%"
            style={{ maxWidth: "480px" }}
            padding="60px 20px"
          >
            {children}
          </BoutiqueBox>
        </BoutiqueBox>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* GLOBAL AUTH KEYFRAMES */
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .bq-auth-layout {
          overflow-x: hidden;
        }

        .bq-auth-form-constraint {
          animation: fadeIn 0.6s ease;
        }

        .bq-spin { animation: bq-spin 1s linear infinite; }
        .bq-fade-in { animation: fadeIn 0.4s ease; }
        .bq-slide-down { animation: slideDown 0.3s ease; }

        /* RESPONSIVE STACKING */
        @media (max-width: 1024px) {
          .bq-auth-flex { flex-direction: column !important; }
          .bq-auth-brand-area { flex: none !important; height: fit-content; }
          .bq-auth-form-area { flex: none !important; min-height: 60vh; padding: 32px 24px; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
