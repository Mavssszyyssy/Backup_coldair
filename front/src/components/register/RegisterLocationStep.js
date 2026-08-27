import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  NavigationArrow,
  Plus,
  Spinner,
  Trash,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  getBarangaysByCity,
  getCitiesByProvince,
  getProvincesByRegion,
  getRegions,
} from "../../domain/location/addressSelectors";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";

const INITIAL_ADDRESS = {
  region: "",
  province: "",
  city: "",
  barangay: "",
  street: "",
};

const INITIAL_LOCATION = {
  coordinates: {
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  },
  address: { ...INITIAL_ADDRESS },
  source: "manual",
};

export default function RegisterLocationStep({
  formData,
  onFieldChange,
  onNext,
  onBack,
  loading = false,
}) {
  // Defensive guard for locations array
  const locations = formData.locations || [];

  const [showAddForm, setShowAddForm] = useState(locations.length === 0);
  const [currentLoc, setCurrentLoc] = useState({ ...INITIAL_LOCATION });
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState("");

  const regions = getRegions();
  const provinces = getProvincesByRegion(currentLoc.address.region);
  const cities = getCitiesByProvince(
    currentLoc.address.region,
    currentLoc.address.province,
  );
  const barangays = getBarangaysByCity(
    currentLoc.address.region,
    currentLoc.address.province,
    currentLoc.address.city,
  );

  const updateField = (field, value) => {
    const updated = {
      ...currentLoc,
      address: { ...currentLoc.address, [field]: value },
    };
    if (field === "region") {
      updated.address.province = "";
      updated.address.city = "";
      updated.address.barangay = "";
    } else if (field === "province") {
      updated.address.city = "";
      updated.address.barangay = "";
    } else if (field === "city") {
      updated.address.barangay = "";
    }
    setCurrentLoc(updated);
  };

  const captureGps = () => {
    setIsCapturing(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      setIsCapturing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY || "";
          if (!apiKey) throw new Error("Location lookup is not configured.");
          const res = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`,
          );

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            setCurrentLoc({
              coordinates: {
                latitude,
                longitude,
                accuracy,
                timestamp: new Date().toISOString(),
              },
              address: {
                region: addr.region || addr.state || "",
                province: addr.province || addr.county || "",
                city:
                  addr.city ||
                  addr.municipality ||
                  addr.town ||
                  addr.village ||
                  "",
                barangay: addr.suburb || addr.neighbourhood || "",
                street: [addr.road, addr.house_number]
                  .filter(Boolean)
                  .join(" "),
              },
              source: "gps",
            });
          }
        } catch (err) {
          setCurrentLoc((prev) => ({
            ...prev,
            coordinates: {
              latitude,
              longitude,
              accuracy,
              timestamp: new Date().toISOString(),
            },
            source: "gps",
          }));
        }
        setIsCapturing(false);
      },
      () => {
        setError("Permission denied.");
        setIsCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const addLocation = () => {
    if (!currentLoc.address.city || !currentLoc.address.street) {
      setError("City and Street Address are required.");
      return;
    }
    const updated = [...locations, { ...currentLoc }];
    onFieldChange("locations", updated);
    setCurrentLoc({ ...INITIAL_LOCATION });
    setShowAddForm(false);
    setError("");
  };

  const removeLocation = (index) => {
    const updated = locations.filter((_, i) => i !== index);
    onFieldChange("locations", updated);
    if (updated.length === 0) setShowAddForm(true);
  };

  return (
    <BoutiqueStack
      gap={40}
      className="bq-location-flow bq-fade-in"
      height="100%"
    >
      <BoutiqueBox className="bq-flow-header">
        <BoutiqueText
          variant="h1"
          className="bq-flow-title"
          style={{ letterSpacing: "-0.02em" }}
        >
          Facility Hub
        </BoutiqueText>
        <BoutiqueText
          variant="body"
          className="bq-flow-desc"
          margin="8px 0 0"
          color={BQ_COLORS.inkMuted}
          weight={500}
          style={{ opacity: 0.8 }}
        >
          Register one or more locations for optimized service logistics.
        </BoutiqueText>
      </BoutiqueBox>

      {/* LIST OF ADDED LOCATIONS */}
      {locations.length > 0 && (
        <BoutiqueStack gap={12} className="bq-loc-list">
          {locations.map((loc, i) => (
            <BoutiqueBox
              key={i}
              direction="row"
              align="center"
              justify="space-between"
              padding="16px 24px"
              background="white"
              className="bq-loc-item bq-slide-down"
              style={{
                border: `1px solid ${BQ_COLORS.border}`,
                borderRadius: "20px",
                boxShadow: BQ_SHADOWS.soft,
              }}
            >
              <BoutiqueBox
                direction="row"
                align="center"
                gap={16}
                className="bq-loc-item-info"
              >
                <MapPin size={20} weight="fill" color={BQ_COLORS.accent} />
                <BoutiqueBox className="bq-loc-item-text">
                  <BoutiqueText
                    size="14px"
                    weight={700}
                    className="bq-loc-item-city"
                  >
                    {loc.address.city}, {loc.address.barangay}
                  </BoutiqueText>
                  <BoutiqueText
                    size="12px"
                    color={BQ_COLORS.inkMuted}
                    className="bq-loc-item-street"
                  >
                    {loc.address.street}
                  </BoutiqueText>
                </BoutiqueBox>
              </BoutiqueBox>
              <button
                type="button"
                className="bq-loc-item-remove"
                onClick={() => removeLocation(i)}
              >
                <Trash size={18} weight="bold" />
              </button>
            </BoutiqueBox>
          ))}

          {!showAddForm && (
            <button
              type="button"
              className="bq-add-another-btn"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} weight="bold" /> Add Another Facility
            </button>
          )}
        </BoutiqueStack>
      )}

      {/* ADD FORM */}
      {showAddForm && (
        <BoutiqueStack
          gap={24}
          padding={32}
          background={BQ_COLORS.bgAlt}
          className="bq-loc-add-form bq-fade-in"
          style={{
            borderRadius: "28px",
            border: `1.5px solid ${BQ_COLORS.border}`,
          }}
        >
          <BoutiqueBox
            padding={20}
            background="white"
            className="bq-gps-hub"
            style={{
              border: `1px solid ${BQ_COLORS.border}`,
              borderRadius: "16px",
              boxShadow: BQ_SHADOWS.soft,
            }}
          >
            <BoutiqueBox
              direction="row"
              align="center"
              justify="space-between"
              className="bq-hub-content"
            >
              <BoutiqueBox className="bq-hub-text">
                <BoutiqueText
                  variant="label"
                  color={BQ_COLORS.accent}
                  className="bq-hub-label"
                >
                  Technical Assist
                </BoutiqueText>
                <BoutiqueText
                  variant="h3"
                  className="bq-hub-value"
                  margin="4px 0 0"
                >
                  GPS Auto-Capture
                </BoutiqueText>
              </BoutiqueBox>
              <BoutiqueButton
                type="button"
                variant={currentLoc.source === "gps" ? "outline" : "primary"}
                size="sm"
                onClick={captureGps}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <Spinner className="bq-spin" size={16} />
                ) : (
                  <NavigationArrow size={16} weight="bold" />
                )}
                {isCapturing ? "Acquiring..." : "Sync Position"}
              </BoutiqueButton>
            </BoutiqueBox>
            {error && (
              <BoutiqueBox
                direction="row"
                align="center"
                gap={6}
                margin="12px 0 0"
                className="bq-hub-error"
              >
                <WarningDiamond size={14} weight="bold" />
                <BoutiqueText size="12px" weight={700} color={BQ_COLORS.danger}>
                  {error}
                </BoutiqueText>
              </BoutiqueBox>
            )}
          </BoutiqueBox>

          <BoutiqueGrid columns="1fr 1fr" gap={20} className="bq-address-grid">
            <BoutiqueInput
              label="Region"
              type="select"
              value={currentLoc.address.region}
              onChange={(e) => updateField("region", e.target.value)}
              options={regions.map((r) => ({ value: r, label: r }))}
              placeholder="Select Region"
            />
            <BoutiqueInput
              label="Province"
              type="select"
              value={currentLoc.address.province}
              onChange={(e) => updateField("province", e.target.value)}
              disabled={!currentLoc.address.region}
              options={provinces.map((p) => ({ value: p, label: p }))}
              placeholder="Select Province"
            />
            <BoutiqueInput
              label="City"
              type="select"
              value={currentLoc.address.city}
              onChange={(e) => updateField("city", e.target.value)}
              disabled={!currentLoc.address.province}
              options={cities.map((c) => ({ value: c, label: c }))}
              placeholder="Select City"
            />
            <BoutiqueInput
              label="Barangay"
              type="select"
              value={currentLoc.address.barangay}
              onChange={(e) => updateField("barangay", e.target.value)}
              disabled={!currentLoc.address.city}
              options={barangays.map((b) => ({ value: b, label: b }))}
              placeholder="Select Barangay"
            />
            <BoutiqueBox style={{ gridColumn: "span 2" }}>
              <BoutiqueInput
                label="Street Address"
                placeholder="House No., Building, Street"
                value={currentLoc.address.street}
                onChange={(e) => updateField("street", e.target.value)}
              />
            </BoutiqueBox>
          </BoutiqueGrid>

          <BoutiqueBox
            direction="row"
            justify="flex-end"
            gap={12}
            margin="8px 0 0"
            className="bq-add-form-actions"
          >
            <BoutiqueButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              disabled={locations.length === 0}
            >
              Cancel
            </BoutiqueButton>
            <BoutiqueButton type="button" size="sm" onClick={addLocation}>
              Save Facility
            </BoutiqueButton>
          </BoutiqueBox>
        </BoutiqueStack>
      )}

      <BoutiqueBox
        direction="row"
        align="center"
        gap={16}
        margin="auto 0 0"
        padding="32px 0 0"
        style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
        className="bq-flow-actions"
      >
        <BoutiqueButton
          type="button"
          variant="ghost"
          size="md"
          onClick={onBack}
          disabled={loading}
          style={{ flex: 1 }}
        >
          <ArrowLeft size={18} weight="bold" /> Back
        </BoutiqueButton>

        <BoutiqueButton
          type="button"
          size="md"
          onClick={onNext}
          loading={loading}
          style={{ flex: 2 }}
        >
          {locations.length === 0 ? "Skip for now" : "Complete Setup"}{" "}
          <ArrowRight size={18} weight="bold" />
        </BoutiqueButton>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-loc-item-remove { background: none; border: none; color: ${BQ_COLORS.danger}; cursor: pointer; opacity: 0.4; transition: opacity 0.2s; }
        .bq-loc-item-remove:hover { opacity: 1; }

        .bq-add-another-btn {
            background: ${BQ_COLORS.bg}; border: 1px dashed ${BQ_COLORS.border}; border-radius: 20px;
            padding: 16px; color: ${BQ_COLORS.inkMuted}; font-family: inherit;
            font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; gap: 8px; transition: all 0.3s;
        }
        .bq-add-another-btn:hover { border-color: ${BQ_COLORS.accent}; color: ${BQ_COLORS.accent}; background: white; }

        .bq-spin { animation: bq-spin 1s linear infinite; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bq-slide-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 640px) {
          .bq-address-grid { grid-template-columns: 1fr !important; }
          .bq-address-grid > * { grid-column: span 1 !important; }
        }
      `,
        }}
      />
    </BoutiqueStack>
  );
}
