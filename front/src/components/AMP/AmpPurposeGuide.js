export default function AmpPurposeGuide({ planning = false }) {
  return <section className="amp-card amp-purpose">
    <div>
      <span className="amp-purpose-label">AMP · Predictive maintenance</span>
      <h2>{planning ? "Plan ahead from suggested service dates" : "Know when an AC may need its next cleaning"}</h2>
      <p>AEROPULSE first measures the gaps between this AC unit’s verified cleaning visits. Similar-unit history is used only until the unit has enough history of its own.</p>
    </div>
    <ol className="amp-purpose-steps">
      <li><strong>1. Analyze verified records</strong><span>Only completed cleaning-to-cleaning gaps form the interval pattern. Repairs and refrigerant work stay visible as context but do not become cleaning dates.</span></li>
      <li><strong>2. Generate an AI estimate</strong><span>AI can select the calculated average or a shorter interval already observed when filter or coil dirt records support more frequent cleaning. With insufficient history, the system uses the 6-month baseline.</span></li>
      <li><strong>3. Let the team act</strong><span>{planning ? "Prepare branch staffing and supplies. Branch admins handle customer requests and technician assignments." : "Follow up with the customer. The customer requests service in the mobile app; the branch handles scheduling in Services."}</span></li>
    </ol>
    <p className="amp-muted">Suggested dates are not confirmed bookings or failure guarantees. AI does not approve warranty claims or replace technician inspection.</p>
    <a className="amp-plan-link" href="#amp-service-plan">Review a unit’s service plan</a>
  </section>;
}
