import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";

const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-US") : "Not available";
const serviceLabel = (value) => value === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";

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
  if (loading) return <section className="service-sticker">Loading maintenance recommendation...</section>;
  if (error) return <section className="service-sticker service-sticker-alert">{error}</section>;
  const recommendation = result?.recommendation;
  if (!recommendation) return null;
  return <section className="service-sticker" aria-label="Maintenance recommendation">
    <div className="service-sticker-header"><div><span className="service-sticker-label">Best Serviced By</span><strong>{dateLabel(recommendation.bestServicedBy)}</strong></div></div>
    <div className="service-sticker-insight"><strong>{serviceLabel(recommendation.recommendedService)}</strong><p>{result?.insight?.recommendation_summary || recommendation.recommendationBasis}</p></div>
    {recommendation.capacityAssessment?.summary ? <p>{recommendation.capacityAssessment.summary}</p> : null}
    <p className="service-sticker-app-note">Request service in the Coldair Mobile App using the same AeroPulse account.</p>
  </section>;
}

export default DynamicServiceSticker;
