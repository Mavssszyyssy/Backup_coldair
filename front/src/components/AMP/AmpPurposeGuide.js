export default function AmpPurposeGuide({ planning = false }) {
  return <section className="amp-card amp-purpose">
    <div>
      <span className="amp-purpose-label">AMP · Predictive maintenance</span>
      <h2>{planning ? "Plan ahead from suggested service dates" : "Know when an AC may need its next cleaning"}</h2>
      <p>Completed service records from the same model or brand help the system suggest a servicing date—even for a unit with little history of its own.</p>
    </div>
    <ol className="amp-purpose-steps">
      <li><strong>1. Predict the next service</strong><span>Review the suggested date and cleaning method. Limited history uses a provisional schedule, not a proven prediction.</span></li>
      <li><strong>2. Generate an AI estimate</strong><span>Generate a service plan to ask AI for a servicing interval based on verified model or brand history. Accepted dates are saved for unit details and reminders. Without enough history or an available AI connection, the system schedule remains.</span></li>
      <li><strong>3. Let the team act</strong><span>{planning ? "Prepare branch staffing and supplies. Branch admins handle customer requests and technician assignments." : "Follow up with the customer. The customer requests service in the mobile app; the branch handles scheduling in Services."}</span></li>
    </ol>
    <p className="amp-muted">Suggested dates are not confirmed bookings or failure guarantees. AI does not approve warranty claims or replace technician inspection.</p>
    <a className="amp-plan-link" href="#amp-service-plan">Review a unit’s service plan</a>
  </section>;
}
