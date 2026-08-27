import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";

const CATEGORY_OPTIONS = [
  { value: "general", label: "General question" },
  { value: "product", label: "Product question" },
  { value: "order", label: "Help with an order" },
  { value: "other", label: "Other concern" },
];

const makeRequestKey = () =>
  window.crypto?.randomUUID?.() || `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getName = (user = {}) =>
  user.name || `${user.name_first || ""} ${user.name_last || ""}`.trim();

function ContactForm() {
  const { user } = useUser();
  const requestKey = useRef(makeRequestKey());
  const [formData, setFormData] = useState({
    name: getName(user), email: user?.email || "", phone: user?.phone || "",
    category: "general", subject: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      name: current.name || getName(user),
      email: current.email || user?.email || "",
      phone: current.phone || user?.phone || "",
    }));
  }, [user]);

  const update = (field, value) => {
    setError("");
    setConfirmation(null);
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setConfirmation(null);
    try {
      const result = await apiRequest("/contact-messages", {
        method: "POST",
        headers: { "Idempotency-Key": requestKey.current },
        body: JSON.stringify({ ...formData, customerName: formData.name, source: "web" }),
      });
      setConfirmation(result.message);
      setFormData((current) => ({ ...current, category: "general", subject: "", message: "" }));
      requestKey.current = makeRequestKey();
    } catch (requestError) {
      setError(requestError.message || "Your message could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-section" id="contact-message-form">
      <h2>Send Us a Message</h2>
      <p>Your message will be sent to the correct branch team and can also be reviewed by SuperAdmin.</p>
      <div className="contact-mobile-service-note">
        Maintenance, repair, cleaning, installation-support, and warranty requests must be submitted in the AeroPulse Mobile App. Messages sent here do not create service appointments.
        <a href="/services"> View mobile service instructions.</a>
      </div>
      {confirmation ? (
        <div className="contact-form-notice contact-form-notice--success" role="status">
          <strong>Message sent successfully.</strong>
          <span>Keep reference <b>{confirmation.ticketCode}</b>. We will notify you when our team replies.</span>
        </div>
      ) : null}
      {error ? <div className="contact-form-notice contact-form-notice--error" role="alert">{error}</div> : null}
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contact-name">Your Name *</label>
            <input id="contact-name" type="text" value={formData.name} onChange={(event) => update("name", event.target.value)} maxLength={120} required />
          </div>
          <div className="form-group">
            <label htmlFor="contact-email">Email Address *</label>
            <input id="contact-email" type="email" value={formData.email} onChange={(event) => update("email", event.target.value)} maxLength={180} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contact-phone">Phone Number</label>
            <input id="contact-phone" type="tel" placeholder="09XX XXX XXXX" value={formData.phone} onChange={(event) => update("phone", event.target.value)} maxLength={30} />
          </div>
          <div className="form-group">
            <label htmlFor="contact-category">What can we help with? *</label>
            <select id="contact-category" value={formData.category} onChange={(event) => update("category", event.target.value)} required>
              {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="contact-subject">Subject *</label>
          <input id="contact-subject" type="text" placeholder="Briefly describe what you need" value={formData.subject} onChange={(event) => update("subject", event.target.value)} maxLength={160} required />
        </div>
        <div className="form-group">
          <label htmlFor="contact-message">Message *</label>
          <textarea id="contact-message" rows="5" placeholder="Include any order number, AC model, or other details that will help us assist you." value={formData.message} onChange={(event) => update("message", event.target.value)} minLength={10} maxLength={3000} required />
          <small className="contact-character-count">{formData.message.length}/3000</small>
        </div>
        <button type="submit" className="submit-btn" disabled={submitting}>{submitting ? "Sending…" : "Send to Support"}</button>
      </form>
    </div>
  );
}

export default ContactForm;
