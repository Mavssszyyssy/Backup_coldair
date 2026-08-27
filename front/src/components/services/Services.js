import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

const ACTIVE_REQUESTS = new Set(["pending", "submitted", "reviewed", "assigned", "in progress"]);
const ACTIVE_CLAIMS = new Set(["submitted", "under_review", "approved"]);
const todayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const requestKey = () => `web-service-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const defaultAddressFor = (user = {}) => {
  const addresses = Array.isArray(user.addresses) ? user.addresses : [];
  return addresses.find((item) => item?.isDefault) || addresses[0] || user.billingAddress || {};
};

function Services() {
  const navigate = useNavigate();
  const { user } = useUser();
  const idempotencyKey = useRef(requestKey());
  const [units, setUnits] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [issue, setIssue] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("service");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [unitResult, catalogResult, requestResult] = await Promise.all([
        apiRequest("/amp/customer/units"),
        apiRequest("/service-requests/catalog"),
        apiRequest("/service-requests/me"),
      ]);
      const nextUnits = unitResult.units || [];
      const nextOfferings = catalogResult.offerings || [];
      setUnits(nextUnits);
      setOfferings(nextOfferings);
      setRequests(requestResult.requests || []);
      setUnitId((current) => current || String(nextUnits[0]?.id || ""));
      setServiceId((current) => current || String(nextOfferings[0]?.id || ""));
    } catch (loadError) {
      setError(loadError.message || "Unable to load service information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectedUnit = useMemo(() => units.find((unit) => String(unit.id) === unitId) || null, [units, unitId]);
  const selectedService = useMemo(() => offerings.find((service) => String(service.id) === serviceId) || null, [offerings, serviceId]);
  const activeRequest = useMemo(
    () => requests.find((item) => String(item.unitId) === unitId && ACTIVE_REQUESTS.has(String(item.status || "").toLowerCase())),
    [requests, unitId],
  );
  const activeClaim = useMemo(
    () => (selectedUnit?.warranty?.claims || []).find((claim) => ACTIVE_CLAIMS.has(String(claim.status || "").toLowerCase())),
    [selectedUnit],
  );
  const warrantyEligible = Boolean(
    selectedService && /repair/i.test(`${selectedService.title} ${selectedService.defaultIssueType}`) &&
    String(selectedUnit?.warrantyStatus || "").toLowerCase() === "active" && !activeClaim,
  );

  useEffect(() => {
    if (!warrantyEligible && mode === "warranty") setMode("service");
  }, [warrantyEligible, mode]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedUnit || !selectedService) return setError("Choose an AC unit and service type.");
    if (activeRequest || activeClaim) return setError("This unit already has an active service or warranty request.");
    if (issue.trim().length < 10) return setError("Describe the concern using at least 10 characters.");
    if (mode === "service" && !preferredDate) return setError("Choose a preferred service date.");

    setSubmitting(true);
    try {
      if (mode === "warranty" && warrantyEligible) {
        await apiRequest(`/warranties/units/${encodeURIComponent(selectedUnit.id)}/claims`, {
          method: "POST",
          body: JSON.stringify({ issue: issue.trim(), notes: notes.trim() }),
        });
        setMessage("Warranty support submitted. The service team will review it before arranging a visit.");
      } else {
        const address = defaultAddressFor(user);
        const addressText = [address.street, address.barangay, address.city, address.province, address.region, address.postalCode]
          .filter(Boolean).join(", ");
        await apiRequest("/service-requests/me", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey.current },
          body: JSON.stringify({
            unitId: selectedUnit.id,
            unitName: selectedUnit.unitName,
            unitSerialNumber: selectedUnit.serialNumber,
            serviceId: selectedService.id,
            serviceType: selectedService.title,
            issueDescription: issue.trim(),
            preferredDate,
            notes: notes.trim(),
            address: addressText,
            city: address.city || "",
            province: address.province || "",
            barangay: address.barangay || "",
            customerPhone: address.phone || user?.phone || "",
            source: "web",
          }),
        });
        setMessage("Service request submitted. We will notify you after a technician and time slot are assigned.");
      }
      idempotencyKey.current = requestKey();
      setIssue("");
      setNotes("");
      setPreferredDate("");
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to submit this request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader title="AC Services" leftAction="back" onLeftAction={() => navigate("/shop")} />
      <BoutiqueBox width="100%" padding="40px 24px" style={{ maxWidth: 900, margin: "0 auto" }}>
        <BoutiqueStack gap={20}>
          <BoutiqueStack gap={6}>
            <BoutiqueText variant="h1">Book service or warranty support</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted}>Web and mobile use the same units, warranty records, requests, and assigned branch workflow.</BoutiqueText>
          </BoutiqueStack>
          {error ? <BoutiqueCard><BoutiqueText color="#b42318">{error}</BoutiqueText></BoutiqueCard> : null}
          {message ? <BoutiqueCard><BoutiqueText color="#067647">{message}</BoutiqueText></BoutiqueCard> : null}
          {loading ? <BoutiqueCard><BoutiqueText>Loading service information…</BoutiqueText></BoutiqueCard> : null}
          {!loading && !units.length ? <BoutiqueCard><BoutiqueStack gap={12}><BoutiqueText variant="h3">No registered AC units yet</BoutiqueText><BoutiqueText color={BQ_COLORS.inkMuted}>A completed installation adds the purchased unit to My AC Units before service can be requested.</BoutiqueText><BoutiqueButton onClick={() => navigate("/shop")}>Shop AC Units</BoutiqueButton></BoutiqueStack></BoutiqueCard> : null}
          {!loading && units.length ? (
            <BoutiqueCard padding={28}>
              <form onSubmit={submit}>
                <BoutiqueStack gap={18}>
                  <label><BoutiqueText weight={800}>Registered AC unit</BoutiqueText><select value={unitId} onChange={(event) => setUnitId(event.target.value)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitName} · {unit.serialNumber}</option>)}</select></label>
                  <label><BoutiqueText weight={800}>Service type</BoutiqueText><select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{offerings.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label>
                  {activeRequest ? <BoutiqueText color="#b54708">An active request already exists: {activeRequest.status}.</BoutiqueText> : null}
                  {activeClaim ? <BoutiqueText color="#b54708">Warranty claim {activeClaim.claimId} is {String(activeClaim.status).replaceAll("_", " ")}.</BoutiqueText> : null}
                  {warrantyEligible ? <BoutiqueBox direction="row" gap={10}><BoutiqueButton type="button" variant={mode === "warranty" ? "primary" : "outline"} onClick={() => setMode("warranty")}>Use Warranty</BoutiqueButton><BoutiqueButton type="button" variant={mode === "service" ? "primary" : "outline"} onClick={() => setMode("service")}>Standard Repair</BoutiqueButton></BoutiqueBox> : null}
                  {mode === "service" ? <label><BoutiqueText weight={800}>Preferred date</BoutiqueText><input type="date" min={todayKey()} value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} required /></label> : null}
                  <label><BoutiqueText weight={800}>Service concern</BoutiqueText><textarea rows="5" maxLength={1000} value={issue} onChange={(event) => setIssue(event.target.value)} placeholder="Describe the issue or service needed" required /></label>
                  <label><BoutiqueText weight={800}>Additional notes</BoutiqueText><textarea rows="3" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Site instructions or preferences (optional)" /></label>
                  <BoutiqueButton type="submit" loading={submitting} disabled={submitting || Boolean(activeRequest) || Boolean(activeClaim)}>{mode === "warranty" ? "Submit Warranty Support" : "Submit Service Request"}</BoutiqueButton>
                </BoutiqueStack>
              </form>
            </BoutiqueCard>
          ) : null}
        </BoutiqueStack>
      </BoutiqueBox>
      <BoutiqueFooter />
    </BoutiqueScreen>
  );
}

export default Services;
