import { Snowflake } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import "./MyUnit.css";
import ServiceHistory from "./ServiceHistory";
import UnitCard from "./UnitCard";
import UnitDetailsModal from "./UnitDetailsModal";
import WarrantyStatusModal from "./WarrantyStatusModal";

const formatCustomerDate = (value = "") => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });
};

const buildUnitFromBackend = (unit = {}) => ({
  id: unit.id || unit.serialNumber || `unit-${Date.now()}`,
  backendUnitId: unit.id || "",
  productId: unit.productId || "",
  productSku: unit.productSku || unit.sku || "",
  imageUrl: unit.imageUrl || unit.image || "",
  qrUnitId: unit.qrUnitId || "",
  brand: unit.brand || "Cold Air ACT",
  model: unit.model || unit.modelName || unit.unitName || "Installed AC Unit",
  serialNumber: unit.serialNumber || "",
  qrCode: unit.qrCode || "",
  installationDate: formatCustomerDate(unit.installationDate),
  status: unit.status || "Active",
  bestServicedByLabel:
    formatCustomerDate(unit.bestServicedBy),
  bestServicedBy: unit.bestServicedBy || "",
  recommendedService: unit.recommendedService || "regular_cleaning",
  recommendationBasis: unit.recommendationBasis || "",
  capacityAssessment: unit.capacityAssessment || null,
  technicianReportSummary: "Installation completed and your AC is registered.",
  installEnvironmentNotes: [unit.placementArea, unit.installationEnvironment]
    .filter(Boolean)
    .join(" - "),
  notes: "Added to My Units automatically after installation.",
  warranty: unit.warranty || {},
  warrantyStatus: unit.warrantyStatus || unit.warranty?.status || "pending_activation",
  warrantyExpirationDate: unit.warrantyExpirationDate || unit.warranty?.expirationDate || "",
  warrantyRecommendation: unit.warrantyRecommendation || "",
  serviceHistory: Array.isArray(unit.serviceHistory) ? unit.serviceHistory : [],
});

function MyUnit() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUnits = async () => {
      try {
        const result = await apiRequest("/amp/customer/units");
        const backendUnits = (result.units || []).map(buildUnitFromBackend);
        if (!mounted) return;
        setUnits(backendUnits);
      } catch (_error) {
        if (mounted) setUnits([]);
      }
    };

    loadUnits();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewHistory = (unit) => {
    setSelectedUnit(unit);
    setShowHistoryModal(true);
  };

  const handleViewDetails = (unit) => {
    setSelectedUnit(unit);
    setShowDetailsModal(true);
  };

  const handleWarrantyStatus = (unit) => {
    setSelectedUnit(unit);
    setShowWarrantyModal(true);
  };

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="My AC Units"
        leftAction="back"
        onLeftAction={() => navigate("/home")}
      />

      <BoutiqueBox
        direction="column"
        flex={1}
        width="100%"
        padding="40px 24px"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <BoutiqueBox
          direction="row"
          align="center"
          justify="space-between"
          margin="0 0 32px"
        >
          <BoutiqueStack gap={4}>
            <BoutiqueText variant="h2">Your Registered AC Units</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} size="14px">
              View your AC details, warranty coverage, and recommended service schedule.
            </BoutiqueText>
          </BoutiqueStack>
        </BoutiqueBox>

        {units.length === 0 ? (
          <BoutiqueBox
            flex={1}
            align="center"
            justify="center"
            padding={60}
            background="white"
            style={{
              borderRadius: "24px",
              border: `1px dashed ${BQ_COLORS.border}`,
            }}
          >
            <BoutiqueStack gap={20} align="center">
              <Snowflake size={64} weight="bold" color={BQ_COLORS.inkFaint} />
              <BoutiqueText variant="h3">No Installed AC Units Yet</BoutiqueText>
              <BoutiqueText
                color={BQ_COLORS.inkMuted}
                align="center"
                style={{ maxWidth: "320px" }}
              >
                Completed technician installations automatically appear here
                with their serial number, warranty, AMP, and service history.
              </BoutiqueText>
            </BoutiqueStack>
          </BoutiqueBox>
        ) : (
          <BoutiqueGrid
            columns="repeat(auto-fill, minmax(320px, 1fr))"
            gap={24}
          >
            {units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onClick={handleViewDetails}
                onViewHistory={handleViewHistory}
                onWarrantyStatus={handleWarrantyStatus}
              />
            ))}
          </BoutiqueGrid>
        )}
      </BoutiqueBox>

      {showDetailsModal && selectedUnit && (
        <UnitDetailsModal
          unit={selectedUnit}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUnit(null);
          }}
        />
      )}

      {showHistoryModal && selectedUnit && (
        <ServiceHistory
          unit={selectedUnit}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedUnit(null);
          }}
        />
      )}

      {showWarrantyModal && selectedUnit && (
        <WarrantyStatusModal
          unit={selectedUnit}
          onClose={() => {
            setShowWarrantyModal(false);
            setSelectedUnit(null);
          }}
        />
      )}

      <BoutiqueFooter />
    </BoutiqueScreen>
  );
}

export default MyUnit;
