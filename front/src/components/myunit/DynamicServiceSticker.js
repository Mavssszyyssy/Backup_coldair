import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";

const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" })
  : "Not available";
const serviceLabel = (value) => value === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";

const serviceExplanation = (service) =>
  service === "deep_cleaning"
    ? "A deep cleaning is recommended around this date to restore airflow and cooling performance."
    : "A regular cleaning is recommended around this date to keep your AC cooling efficiently.";

const capacityMessage = (assessment = {}) => {
  const messages = {
    room_size_required: "Add your room size in the Cold Air mobile app to check whether this AC is the right size for your space.",
    capacity_required: "Your AC capacity needs to be confirmed before we can check whether it suits your room.",
    suitable: "This AC is a good match for the room size you provided.",
    insufficient: "This AC may be too small for the room size you provided. Ask our service team for advice.",
    higher_than_necessary: "This AC may be larger than needed for the room size you provided. Ask our service team for advice.",
  };
  return messages[assessment.status] || assessment.summary || "";
};

function DynamicServiceSticker({ unit }) {
  const unitId = unit?.ampUnitId || unit?.backendUnitId || unit?.unitId || unit?.id;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    if (!isMongoId(unitId)) return undefined;
    setLoading(true); setError("");
    apiRequest(`/amp/units/${unitId}/next-service`)
      .then((value) => { if (alive) setResult(value); })
      .catch((err) => { if (alive) setError(err.message || "Unable to load maintenance timing."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [unitId]);
  if (!isMongoId(unitId)) return null;
  if (loading) return <section className="service-sticker">Checking your recommended service schedule...</section>;
  if (error) return <section className="service-sticker service-sticker-alert">We could not load your service schedule right now. Please try again.</section>;
  const recommendation = result?.recommendation;
  if (!recommendation) return null;
  const roomGuidance = capacityMessage(recommendation.capacityAssessment);
  const environmentRisk = recommendation.environmentRisk;
  return <section className="service-sticker" aria-label="Recommended service schedule">
    <div className="service-sticker-header"><div><span className="service-sticker-label">Recommended Service Date</span><strong>{dateLabel(recommendation.bestServicedBy)}</strong></div></div>
    <div className="service-sticker-insight"><strong>{serviceLabel(recommendation.recommendedService)}</strong><p>{serviceExplanation(recommendation.recommendedService)}</p></div>
    {roomGuidance ? <p>{roomGuidance}</p> : null}
    {environmentRisk ? <p><strong>Operating environment:</strong> {environmentRisk.recorded ? `${String(environmentRisk.level || "low").replace(/_/g, " ")} risk · ${environmentRisk.adjustedIntervalDays || "—"}-day maintenance interval.` : "Not recorded yet; the neutral maintenance interval is being used."}</p> : null}
    {recommendation.environmentAssessment ? <p>{recommendation.environmentAssessment}</p> : null}
    <p className="service-sticker-app-note">Book this service in the Cold Air mobile app using your Cold Air account.</p>
  </section>;
}

export default DynamicServiceSticker;
