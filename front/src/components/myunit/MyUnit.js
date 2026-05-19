import { Plus, Snowflake } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
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
import ReportIssueModal from "./ReportIssueModal";
import ScheduleServiceModal from "./ScheduleServiceModal";
import ServiceHistory from "./ServiceHistory";
import UnitCard from "./UnitCard";
import UnitDetailsModal from "./UnitDetailsModal";
import WarrantyStatusModal from "./WarrantyStatusModal";
// import icons from '../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

function MyUnit() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingUnit, setReportingUnit] = useState(null);

  const { user } = useUser();

  useEffect(() => {
    const savedUnits = localStorage.getItem("ac_units");
    if (savedUnits) {
      const parsedUnits = JSON.parse(savedUnits);
      if (Array.isArray(parsedUnits) && parsedUnits.length > 0) {
        setUnits(parsedUnits);
        return;
      }
    }

    const demoUnits = [
      {
        id: "demo-unit-001",
        brand: "Daikin",
        model: "FTKM Series",
        serialNumber: "DKN-20240514-001",
        installationDate: "2025-02-15",
        status: "Good",
        ampereNextServiceLabel: "Next recommended service in 180 days",
        technicianReportSummary:
          "Demo report: unit passed installation inspection. Monitor cooling efficiency monthly.",
        installEnvironmentNotes:
          "Mounted in living room with unobstructed airflow.",
        notes:
          "This demo unit helps validate the unit, report, and admin assignment flow.",
        serviceHistory: [
          {
            id: "demo-svc-001",
            date: "2025-03-10",
            time: "09:00",
            serviceType: "Cleaning and inspection",
            details: "Initial demo maintenance completed",
            price: 899,
            technician: "Senior tech",
            status: "Completed",
          },
        ],
      },
    ];

    setUnits(demoUnits);
    localStorage.setItem("ac_units", JSON.stringify(demoUnits));
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

  const handleScheduleService = (unit) => {
    setSelectedUnit(unit);
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = (unit, serviceData) => {
    const servicePrice = (() => {
      switch (serviceData.serviceTypeId) {
        case "cleaning_inspection":
          return 899;
        case "diagnosis_repair":
          return 1499;
        case "location_transfer":
          return 0;
        default:
          break;
      }
      if (serviceData.serviceType === "Cleaning and inspection") return 899;
      if (serviceData.serviceType === "Diagnosis and repair") return 1499;
      return 899;
    })();

    const totalPrice =
      servicePrice +
      (serviceData.technician === "senior"
        ? 200
        : serviceData.technician === "express"
          ? 500
          : 0);

    const newService = {
      id: Date.now(),
      date: serviceData.date,
      time: serviceData.time,
      serviceType: serviceData.serviceType,
      details: serviceData.notes || "Scheduled service",
      price: totalPrice,
      technician: serviceData.technician,
      status: "scheduled",
    };

    const updatedUnits = units.map((u) => {
      if (u.id === unit.id) {
        const updatedUnit = {
          ...u,
          serviceHistory: [...(u.serviceHistory || []), newService],
          status: "Needs Service",
        };
        return updatedUnit;
      }
      return u;
    });

    saveUnits(updatedUnits);
    setShowScheduleModal(false);
    alert(
      `Service scheduled for ${unit.brand} ${unit.model} on ${serviceData.date} at ${serviceData.time}\nTotal: ₱${totalPrice.toLocaleString()}`,
    );
  };

  const handleViewHistory = (unit) => {
    setSelectedUnit(unit);
    setShowHistoryModal(true);
  };

  const handleViewDetails = (unit) => {
    setSelectedUnit(unit);
    setShowDetailsModal(true);
  };

  const handleReportIssue = (unit) => {
    setReportingUnit(unit);
    setShowReportModal(true);
  };

  const handleSubmitReport = async (reportData) => {
    if (!reportingUnit) return;

    try {
      await apiRequest("/service-requests/me", {
        method: "POST",
        body: JSON.stringify({
          customerName: user?.name || user?.email || "Demo customer",
          customerEmail: user?.email || "",
          customerPhone: user?.phone || "",
          issueType: reportData.issueType,
          issueDescription: reportData.issueDescription,
          issue: `${reportData.issueType}: ${reportData.issueDescription}`,
          address: reportData.address,
          unitId: reportingUnit.id,
          unitName: `${reportingUnit.brand} ${reportingUnit.model}`,
          status: "Submitted",
        }),
      });

      const updatedUnits = units.map((u) => {
        if (u.id === reportingUnit.id) {
          return {
            ...u,
            status: "Needs Service",
            technicianReportSummary: `Issue reported: ${reportData.issueDescription}`,
            notes: `A service report has been submitted to admin for assignment.`,
          };
        }
        return u;
      });

      saveUnits(updatedUnits);
      setShowReportModal(false);
      setReportingUnit(null);
      alert(
        "Issue reported successfully. Admin will receive the service request and assign a technician.",
      );
    } catch (error) {
      alert(error?.message || "Failed to send report. Please try again.");
    }
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

  const handleBack = () => {
    navigate("/home");
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
                onScheduleService={handleScheduleService}
                onViewHistory={handleViewHistory}
                onWarrantyStatus={handleWarrantyStatus}
                onRegisterQr={handleRegisterQrRequest}
                onReportIssue={handleReportIssue}
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
          onReport={handleReportIssue}
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

      {showScheduleModal && selectedUnit && (
        <ScheduleServiceModal
          unit={selectedUnit}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedUnit(null);
          }}
          onSchedule={handleConfirmSchedule}
        />
      )}

      {showReportModal && reportingUnit && (
        <ReportIssueModal
          unit={reportingUnit}
          user={user}
          onClose={() => {
            setShowReportModal(false);
            setReportingUnit(null);
          }}
          onSubmit={handleSubmitReport}
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
