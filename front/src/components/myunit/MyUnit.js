import { Plus, Snowflake } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import AddUnitModal from "./AddUnitModal";
import "./MyUnit.css";
import RegisterQrUnitModal from "./RegisterQrUnitModal";
import ServiceHistory from "./ServiceHistory";
import UnitCard from "./UnitCard";
import UnitDetailsModal from "./UnitDetailsModal";
import WarrantyStatusModal from "./WarrantyStatusModal";

const buildUnitFromBackend = (unit = {}) => ({
  id: unit.id || unit.serialNumber || `unit-${Date.now()}`,
  backendUnitId: unit.id || "",
  qrUnitId: unit.qrUnitId || "",
  brand: unit.brand || "Cold Air ACT",
  model: unit.model || unit.modelName || unit.unitName || "Installed AC Unit",
  serialNumber: unit.serialNumber || "",
  qrCode: unit.qrCode || "",
  installationDate: unit.installationDate || "",
  status: unit.status || "Active",
  ampereNextServiceLabel:
    unit.nextIdealServicePeriod ||
    (unit.nextIdealServiceDate ? `Next service around ${unit.nextIdealServiceDate}` : ""),
  technicianReportSummary: "Installed unit synced from completed technician fulfillment.",
  installEnvironmentNotes: [unit.placementArea, unit.installationEnvironment]
    .filter(Boolean)
    .join(" - "),
  notes: "This unit was created from the backend order-to-installation handoff.",
  warranty: unit.warranty || {},
  warrantyStatus: unit.warrantyStatus || unit.warranty?.status || "pending_activation",
  warrantyExpirationDate: unit.warrantyExpirationDate || unit.warranty?.expirationDate || "",
  warrantyRecommendation: unit.warrantyRecommendation || "",
  serviceHistory: Array.isArray(unit.serviceHistory) ? unit.serviceHistory : [],
});

function MyUnit() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUnits = async () => {
      try {
        const result = await apiRequest("/amp/customer/units");
        const backendUnits = (result.units || []).map(buildUnitFromBackend);
        if (backendUnits.length > 0) {
          if (!mounted) return;
          setUnits(backendUnits);
          localStorage.setItem("ac_units", JSON.stringify(backendUnits));
          return;
        }
      } catch (_error) {
        // Local cache keeps manually added units available if backend units are not ready.
      }

      const savedUnits = localStorage.getItem("ac_units");
      if (savedUnits) {
        const parsedUnits = JSON.parse(savedUnits);
        if (Array.isArray(parsedUnits) && parsedUnits.length > 0) {
          if (mounted) setUnits(parsedUnits);
          return;
        }
      }

      if (!mounted) return;
      setUnits([]);
      localStorage.removeItem("ac_units_demo_seeded");
    };

    loadUnits();
    return () => {
      mounted = false;
    };
  }, []);

  const saveUnits = (updatedUnits) => {
    setUnits(updatedUnits);
    localStorage.setItem("ac_units", JSON.stringify(updatedUnits));
  };

  const handleAddUnit = (newUnit) => {
    const updatedUnits = [...units, newUnit];
    saveUnits(updatedUnits);
    setShowAddModal(false);
    alert("AC Unit added successfully!");
  };

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

  const handleRegisterQrRequest = () => {
    setShowQrModal(true);
  };

  const handleQrRegister = (newUnit) => {
    const updatedUnits = [...units, newUnit];
    saveUnits(updatedUnits);
    setShowQrModal(false);
    alert(
      `Unit registered. AMPERE next service: ${newUnit.ampereNextServiceLabel || "—"}`,
    );
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
            <BoutiqueText variant="h2">My Facilities</BoutiqueText>
            <BoutiqueText color={BQ_COLORS.inkMuted} size="14px">
              Track maintenance and service history for your units.
            </BoutiqueText>
          </BoutiqueStack>
          <BoutiqueButton
            variant="primary"
            size="md"
            onClick={() => setShowAddModal(true)}
            style={{ width: "auto" }}
          >
            <Plus size={18} weight="bold" /> Add New Unit
          </BoutiqueButton>
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
              <BoutiqueText variant="h3">No AC Units Added</BoutiqueText>
              <BoutiqueText
                color={BQ_COLORS.inkMuted}
                align="center"
                style={{ maxWidth: "320px" }}
              >
                Add your AC units to track maintenance and receive service
                reminders.
              </BoutiqueText>
              <BoutiqueButton
                variant="outline"
                onClick={() => setShowAddModal(true)}
                style={{ width: "auto", marginTop: "12px" }}
              >
                + Add Your First Unit
              </BoutiqueButton>
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
                onRegisterQr={handleRegisterQrRequest}
              />
            ))}
          </BoutiqueGrid>
        )}
      </BoutiqueBox>

      {showAddModal && (
        <AddUnitModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddUnit}
        />
      )}

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

      {showQrModal && (
        <RegisterQrUnitModal
          onClose={() => setShowQrModal(false)}
          onRegister={handleQrRegister}
        />
      )}
      <BoutiqueFooter />
    </BoutiqueScreen>
  );
}

export default MyUnit;
