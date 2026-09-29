import { ArrowRight, Info } from "@phosphor-icons/react";

export default function AmpPurposeGuide({ planning = false }) {
  return <section className="amp-card amp-purpose">
    <div className="amp-purpose-heading">
      <span className="amp-purpose-icon"><Info size={22} weight="bold" aria-hidden="true" /></span>
      <div>
        <h2>{planning ? "About this maintenance plan" : "About this maintenance list"}</h2>
        <p>{planning
          ? "Use the suggested service dates to prepare staff and supplies for each branch."
          : "Use this list to see which customers may need a service follow-up."}</p>
      </div>
    </div>
    <div className="amp-purpose-footer">
      <p className="amp-muted">Dates are suggestions only. Confirm the customer’s request and the technician’s findings before scheduling work.</p>
      <a className="amp-plan-link" href="#amp-service-plan">Open service planner <ArrowRight size={16} weight="bold" aria-hidden="true" /></a>
    </div>
  </section>;
}
