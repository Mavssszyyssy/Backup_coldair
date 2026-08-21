import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../config/api";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (from, to) =>
  Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatPeriod = (date) =>
  date.toLocaleString("en-US", { month: "long", year: "numeric" });

const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

const getCustomerInsight = (current, movedCloserDays) => {
  const stress = current?.decay?.environmentalStress || {};
  if (movedCloserDays <= 14) return "";

  if (stress.hotDayCount > 0) {
    return "Due to recent extreme heat in your area, we recommend servicing sooner.";
  }
  if (stress.humidDayCount > 0) {
    return "Recent high humidity in your area can add stress to cooling performance, so your ideal service period moved sooner.";
  }
  if (stress.poorAirDayCount > 0) {
    return "Recent air quality conditions may load filters faster, so your ideal service period moved sooner.";
  }
  return "Recent local conditions moved your ideal service period sooner than last month.";
};

function DynamicServiceSticker({ unit }) {
  const unitId = unit?.ampUnitId || unit?.backendUnitId || unit?.unitId || unit?.id;
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const loadSticker = async () => {
      if (!isMongoId(unitId)) return;
      setLoading(true);
      setError("");
      try {
        const lastMonth = addDays(new Date(), -30).toISOString();
        const [currentResult, previousResult] = await Promise.all([
          apiRequest(`/amp/units/${unitId}/next-service`),
          apiRequest(
            `/amp/units/${unitId}/next-service?asOfDate=${encodeURIComponent(lastMonth)}&persist=false`,
          ),
        ]);
        if (!alive) return;
        setCurrent(currentResult);
        setPrevious(previousResult);
      } catch (err) {
        if (alive) setError(err.message || "Unable to load service timing.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadSticker();
    return () => {
      alive = false;
    };
  }, [unitId]);

  const sticker = useMemo(() => {
    const targetDate = current?.next_ideal_service_date
      ? new Date(current.next_ideal_service_date)
      : null;
    const previousTargetDate = previous?.next_ideal_service_date
      ? new Date(previous.next_ideal_service_date)
      : null;
    const baselineDate = current?.baseline?.serviceDate
      ? new Date(current.baseline.serviceDate)
      : null;
    const now = new Date();

    if (!targetDate || Number.isNaN(targetDate.getTime())) {
      return null;
    }

    const totalWindowDays = baselineDate
      ? Math.max(1, daysBetween(baselineDate, targetDate))
      : 180;
    const elapsedDays = baselineDate
      ? Math.max(0, daysBetween(baselineDate, now))
      : Math.max(0, 180 - daysBetween(now, targetDate));
    const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalWindowDays) * 100)));
    const movedCloserDays = previousTargetDate
      ? Math.max(0, daysBetween(targetDate, previousTargetDate))
      : 0;

    return {
      targetDate,
      period: current.next_ideal_service_period || formatPeriod(targetDate),
      progress,
      movedCloserDays,
      insight: getCustomerInsight(current, movedCloserDays),
    };
  }, [current, previous]);

  if (!isMongoId(unitId)) {
    return unit?.ampereNextServiceLabel ? (
      <section className="service-sticker service-sticker-static">
        <span className="service-sticker-label">Next Ideal Servicing Period</span>
        <strong>{unit.ampereNextServiceLabel}</strong>
        <p className="service-sticker-app-note">
          Request servicing in the Coldair Mobile App.
        </p>
      </section>
    ) : null;
  }

  if (loading) {
    return <section className="service-sticker">Loading service timing...</section>;
  }

  if (error) {
    return <section className="service-sticker service-sticker-alert">{error}</section>;
  }

  if (!sticker) return null;

  return (
    <section className="service-sticker" aria-label="Dynamic service sticker">
      <div className="service-sticker-header">
        <div>
          <span className="service-sticker-label">Next Ideal Servicing Period</span>
          <strong>{sticker.period}</strong>
        </div>
        <div className="service-sticker-dial" style={{ "--service-progress": `${sticker.progress}%` }}>
          <span>{sticker.progress}%</span>
        </div>
      </div>

      <div className="service-sticker-track" aria-hidden="true">
        <span style={{ width: `${sticker.progress}%` }} />
      </div>

      {sticker.insight ? (
        <div className="service-sticker-insight">
          <strong>Service timing updated</strong>
          <p>{sticker.insight}</p>
        </div>
      ) : null}

      <p className="service-sticker-app-note">
        To request servicing or coordinate a technician, open the Coldair
        Mobile App and use the same AeroPulse account.
      </p>
    </section>
  );
}

export default DynamicServiceSticker;
