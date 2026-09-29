import { ArrowRight, ChartLineUp, Database, Sparkle, Wrench } from "@phosphor-icons/react";

const GUIDE_STEPS = [
  { icon: Database, title: "Analyze verified records" },
  { icon: Sparkle, title: "Generate an AI estimate" },
  { icon: Wrench, title: "Let the team act" },
];

export default function AmpPurposeGuide({ planning = false }) {
  return <section className="amp-card amp-purpose">
    <div className="amp-purpose-heading">
      <span className="amp-purpose-icon"><ChartLineUp size={25} weight="duotone" aria-hidden="true" /></span>
      <div>
        <span className="amp-purpose-label">AMP · Predictive maintenance</span>
        <h2>{planning ? "Plan ahead from suggested service dates" : "Know when an AC may need its next cleaning"}</h2>
        <p>AEROPULSE first measures the gaps between this AC unit’s verified cleaning visits. Similar-unit history is used only until the unit has enough history of its own.</p>
      </div>
    </div>
    <ol className="amp-purpose-steps">
      <li><span className="amp-purpose-step-icon"><Database size={20} weight="duotone" aria-hidden="true" /></span><strong>1. {GUIDE_STEPS[0].title}</strong><span>Only completed cleaning-to-cleaning gaps form the interval pattern. Repairs and refrigerant work stay visible as context but do not become cleaning dates.</span></li>
      <li><span className="amp-purpose-step-icon"><Sparkle size={20} weight="duotone" aria-hidden="true" /></span><strong>2. {GUIDE_STEPS[1].title}</strong><span>AI can select the calculated average or a shorter interval already observed when filter or coil dirt records support more frequent cleaning. With insufficient history, the system uses the 6-month baseline.</span></li>
      <li><span className="amp-purpose-step-icon"><Wrench size={20} weight="duotone" aria-hidden="true" /></span><strong>3. {GUIDE_STEPS[2].title}</strong><span>{planning ? "Prepare branch staffing and supplies. Branch admins handle customer requests and technician assignments." : "Follow up with the customer. The customer requests service in the mobile app; the branch handles scheduling in Services."}</span></li>
    </ol>
    <div className="amp-purpose-footer">
      <p className="amp-muted">Suggested dates are not confirmed bookings or failure guarantees. AI does not approve warranty claims or replace technician inspection.</p>
      <a className="amp-plan-link" href="#amp-service-plan">Review a unit’s service plan <ArrowRight size={16} weight="bold" aria-hidden="true" /></a>
    </div>
  </section>;
}
