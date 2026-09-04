import React from "react";
import { ScrollView, Text, View } from "react-native";

import Card from "../ui/Card";
import InfoCard from "../ui/InfoCard";
import { COLORS, FONT, SPACING } from "../../constants/theme";

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

function HistoryTable({ columns, rows, emptyMessage }) {
  if (!rows?.length) {
    return <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{emptyMessage}</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
      <View style={{ minWidth: Math.max(620, columns.length * 112) }}>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: COLORS.border, paddingBottom: 7 }}>
          {columns.map((column) => <Text key={column.key} style={{ width: column.width || 120, color: COLORS.textPrimary, fontSize: FONT.xs, fontWeight: FONT.black }}>{column.label}</Text>)}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={row.id || `${row.date || "history"}-${rowIndex}`} style={{ flexDirection: "row", borderBottomWidth: rowIndex === rows.length - 1 ? 0 : 1, borderColor: COLORS.border, paddingVertical: 9 }}>
            {columns.map((column) => <Text key={column.key} style={{ width: column.width || 120, color: COLORS.textSecondary, fontSize: FONT.xs, lineHeight: 17 }}>{column.format ? column.format(row[column.key], row) : (row[column.key] || "—")}</Text>)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function UnitHistoryPanel({ history }) {
  if (!history?.unit) return null;
  const { unit, maintenanceHistory = [], repairHistory = [], ampHistory = [], recommendation = null } = history;

  return (
    <>
      <Card>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>Verified AC Unit</Text>
        <InfoCard label="AC Unit" value={unit.unitName || "Installed AC Unit"} />
        <InfoCard label="Brand / Model" value={[unit.brand, unit.model].filter(Boolean).join(" / ") || "Not recorded"} />
        <InfoCard label="Serial Number" value={unit.serialNumber || "Not recorded"} />
        <InfoCard label="QR / Unit ID" value={unit.qrUnitId || unit.qrCode || "Not recorded"} />
        <InfoCard label="Installation Date" value={formatDate(unit.installationDate)} />
        <InfoCard label="Current Owner" value={unit.currentOwner || "Not assigned"} />
        <InfoCard label="Current Branch" value={unit.branch || "Not recorded"} />
        <InfoCard label="Warranty Status" value={unit.warrantyStatus || "Not recorded"} />
      </Card>

      <Card>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: 4 }}>Maintenance History</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>Completed visits relevant to this AC unit.</Text>
        <HistoryTable
          columns={[
            { key: "date", label: "Date", format: formatDate },
            { key: "serviceType", label: "Service Type" },
            { key: "technician", label: "Technician" },
            { key: "findings", label: "Findings", width: 170 },
            { key: "actionTaken", label: "Action Taken", width: 170 },
            { key: "status", label: "Status" },
          ]}
          rows={maintenanceHistory}
          emptyMessage="No maintenance visits have been recorded yet."
        />
      </Card>

      <Card>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: 4 }}>Repair History</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>Prior repair concerns and recorded outcomes.</Text>
        <HistoryTable
          columns={[
            { key: "date", label: "Date", format: formatDate },
            { key: "issue", label: "Issue", width: 160 },
            { key: "diagnosis", label: "Diagnosis", width: 150 },
            { key: "partsUsed", label: "Parts Used", width: 150 },
            { key: "technician", label: "Technician" },
            { key: "status", label: "Status" },
          ]}
          rows={repairHistory}
          emptyMessage="No repair history has been recorded."
        />
      </Card>

      <Card>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: 4 }}>Maintenance Recommendations</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>Use recorded history and the current due date to prepare for this visit.</Text>
        <HistoryTable
          columns={[
            { key: "date", label: "Calculated", format: formatDate },
            { key: "bestServicedBy", label: "Suggested Servicing Date", format: formatDate },
            { key: "recommendedService", label: "Recommended Service", format: (value) => String(value || "").replace(/_/g, " ") },
            { key: "recommendationBasis", label: "Historical Basis", width: 260 },
          ]}
          rows={ampHistory}
          emptyMessage="No AMP assessment is available yet."
        />
      </Card>

      <Card>
        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: 4 }}>Maintenance Recommendation</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19, marginBottom: SPACING.sm }}>
          The servicing date comes from completed records for the same model or brand. This is scheduling guidance, not a unit diagnosis.
        </Text>
        <InfoCard label="Suggested Servicing Date" value={formatDate(recommendation?.bestServicedBy)} />
        <InfoCard label="Recommended Service" value={String(recommendation?.recommendedService || "regular cleaning").replace(/_/g, " ")} />
        <InfoCard label="Historical Pattern" value={recommendation?.recommendationBasis || "Comparable service history is still limited."} />
        <InfoCard label="Room Size and Horsepower" value={recommendation?.capacityAssessment?.summary || "Room size is still needed for the horsepower suitability check."} />
        <InfoCard label="Major-Component Policy" value="If major-part work is necessary, coordinate both the compressor/motor and control board for the service trip. Confirm the actual fault by inspection." />
      </Card>
    </>
  );
}
