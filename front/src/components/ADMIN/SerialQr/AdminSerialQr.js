import React, { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import AdminLayout from "../Common/AdminLayout";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import "../adminShared.css";
import "./styles.css";

const getUnitLabel = (product) =>
  [product.name || "AC unit", product.specs].filter(Boolean).join(" · ");

const getSerialLabel = (unit) =>
  unit.serialKind === "manufacturer"
    ? "Manufacturer serial number"
    : "Temporary inventory serial";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const getUnitOwner = (unit = {}) =>
  unit?.ampRegistration?.customerName ||
  unit?.ampRegistration?.customer ||
  (unit.assignedOrderCode ? `Order ${unit.assignedOrderCode}` : "Branch inventory");

const getInstallationStatus = (unit = {}) => {
  const installationDate =
    unit?.ampRegistration?.ampParameters?.installationDate ||
    unit?.ampRegistration?.installationDate ||
    unit?.registeredAt;
  if (installationDate) return `Installed · ${formatDate(installationDate)}`;
  if (unit.status === "assigned") return "Assigned · awaiting installation";
  if (unit.status === "service") return "Service / repair in progress";
  if (unit.status === "retired") return "Retired from service";
  return "Not installed";
};

const getTechnicianQrValue = (unit) =>
  unit.qrCode || `QR_UNIT:${unit.qrUnitId || unit.serialNumber || ""}`;

const AdminSerialQr = ({ embedded = false }) => {
  const { user } = useUser();
  const canManageSerials = user?.role === "superadmin";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serialKindFilter, setSerialKindFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingSerial, setEditingSerial] = useState(null);
  const [serialDraft, setSerialDraft] = useState("");
  const [savingSerial, setSavingSerial] = useState(false);
  const pageSize = 10;

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/products");
      setProducts(result.products || []);
    } catch (err) {
      setError(err.message || "Unable to load product serial numbers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const branchOptions = useMemo(
    () => Array.from(new Set(products.flatMap((product) =>
      (product.serialUnits || []).map((unit) => unit.branch).filter(Boolean),
    ))).sort(),
    [products],
  );

  const statusOptions = useMemo(
    () => Array.from(new Set(products.flatMap((product) =>
      (product.serialUnits || []).map((unit) => unit.status || "available"),
    ))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const hasUnitFilter = branchFilter !== "all" || statusFilter !== "all" || serialKindFilter !== "all";
    return products.map((product) => {
      const modelMatches = !needle || [
        product.name,
        product.brand,
        product.sku,
        product.specs,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const filteredSerialUnits = (product.serialUnits || []).filter((unit) => {
        const status = unit.status || "available";
        const serialKind = unit.serialKind || "temporary";
        const unitMatches = !needle || [
          unit.serialNumber,
          unit.qrUnitId,
          unit.branch,
          status,
          getUnitOwner(unit),
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
        return (modelMatches || unitMatches) &&
          (branchFilter === "all" || unit.branch === branchFilter) &&
          (statusFilter === "all" || status === statusFilter) &&
          (serialKindFilter === "all" || serialKind === serialKindFilter);
      });
      const includeEmptyModel = !hasUnitFilter && (product.serialUnits || []).length === 0 && modelMatches;
      return filteredSerialUnits.length || includeEmptyModel
        ? { ...product, filteredSerialUnits }
        : null;
    }).filter(Boolean);
  }, [branchFilter, products, query, serialKindFilter, statusFilter]);

  const totalSerials = products.reduce(
    (sum, product) => sum + (product.serialUnits?.length || 0),
    0,
  );
  const availableSerials = products.reduce(
    (sum, product) =>
      sum +
      (product.serialUnits || []).filter(
        (unit) => (unit.status || "available") === "available",
      ).length,
    0,
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const firstProductIndex = (page - 1) * pageSize;
  const pageProducts = filteredProducts.slice(firstProductIndex, firstProductIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, query, serialKindFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startSerialEdit = (product, unit) => {
    setEditingSerial({ productId: product.id, currentSerial: unit.serialNumber });
    setSerialDraft(unit.serialNumber || "");
    setError("");
  };

  const cancelSerialEdit = () => {
    setEditingSerial(null);
    setSerialDraft("");
  };

  const saveManufacturerSerial = async () => {
    if (!editingSerial) return;
    setSavingSerial(true);
    setError("");
    try {
      await apiRequest(
        `/products/${editingSerial.productId}/serial-units/${encodeURIComponent(editingSerial.currentSerial)}`,
        { method: "PATCH", body: JSON.stringify({ serialNumber: serialDraft }) },
      );
      cancelSerialEdit();
      await load();
    } catch (err) {
      setError(err.message || "Unable to update the manufacturer serial number.");
    } finally {
      setSavingSerial(false);
    }
  };

  return (
    <AdminLayout
      title="Serial Numbers and QR Codes"
      subtitle="Every QR has a permanent Unit ID. SuperAdmin can replace a temporary inventory serial with the real manufacturer serial before assignment."
      embedded={embedded}
    >
      <div className="serialqr-toolbar admin-card">
        <div>
          <h3>AC Unit QR Registry</h3>
          <p>
            {products.length} models · {availableSerials} available QR labels · {totalSerials} QR records (including sold and assigned units)
          </p>
        </div>
        <div className="serialqr-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search model, SKU, branch, or serial"
          />
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} aria-label="Filter QR records by branch">
            <option value="all">All branches</option>
            {branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter QR records by status">
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status.replace(/-/g, " ")}</option>)}
          </select>
          <select value={serialKindFilter} onChange={(event) => setSerialKindFilter(event.target.value)} aria-label="Filter QR records by serial type">
            <option value="all">All serial types</option>
            <option value="manufacturer">Manufacturer serial</option>
            <option value="temporary">Temporary serial</option>
          </select>
          {(query || branchFilter !== "all" || statusFilter !== "all" || serialKindFilter !== "all") ? (
            <button type="button" className="serialqr-clear" onClick={() => { setQuery(""); setBranchFilter("all"); setStatusFilter("all"); setSerialKindFilter("all"); }}>
              Clear filters
            </button>
          ) : null}
          <button type="button" onClick={load} disabled={loading}>
            {loading ? "Syncing..." : "Sync unique QRs"}
          </button>
        </div>
      </div>

      {error ? <p className="serialqr-error">{error}</p> : null}
      {loading ? <div className="admin-card">Loading serial numbers...</div> : null}

      <div className="serialqr-model-list">
        {pageProducts.map((product) => {
          const serialUnits = product.filteredSerialUnits || [];
          return (
            <section className="admin-card serialqr-model" key={product.id}>
              <header className="serialqr-model-header">
                <div>
                  <h3>{product.name}</h3>
                  <p>
                    {[product.brand, product.specs, product.sku]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                </div>
                <span className="serialqr-count">
                  {
                    serialUnits.filter(
                      (unit) => (unit.status || "available") === "available",
                    ).length
                  } available · {serialUnits.length} QR records
                </span>
              </header>

              {serialUnits.length === 0 ? (
                <p>No serial numbers generated for this model yet.</p>
              ) : (
                <div className="serialqr-grid">
                  {serialUnits.map((unit, index) => (
                    <article className="serialqr-card" key={unit.qrUnitId || unit.serialNumber}>
                      <div className="serialqr-codebox">
                        <QRCodeCanvas
                          value={getTechnicianQrValue(unit)}
                          size={132}
                          level="M"
                          includeMargin
                        />
                      </div>
                      <div className="serialqr-card-body">
                        <strong>{getUnitLabel(product)}</strong>
                        <small>Product model · {product.sku || "No SKU"}</small>
                        <small>QR Unit ID</small>
                        <code title={unit.qrUnitId || unit.qrCode}>{unit.qrUnitId || "Legacy QR identity"}</code>
                        <small>{getSerialLabel(unit)}</small>
                        <code title={unit.serialNumber}>{unit.serialNumber || "Serial pending"}</code>
                        <span>
                          {unit.status || "available"}
                          {unit.branch ? ` · ${unit.branch}` : ""}
                        </span>
                        <small>Current owner · {getUnitOwner(unit)}</small>
                        <small>Installation · {getInstallationStatus(unit)}</small>
                        {canManageSerials && (unit.status || "available") === "available" ? (
                          editingSerial?.productId === product.id &&
                          editingSerial?.currentSerial === unit.serialNumber ? (
                            <div className="serialqr-editor">
                              <label htmlFor={`manufacturer-serial-${product.id}-${index}`}>
                                Real manufacturer serial
                              </label>
                              <input
                                id={`manufacturer-serial-${product.id}-${index}`}
                                value={serialDraft}
                                onChange={(event) => setSerialDraft(event.target.value.toUpperCase())}
                                placeholder="Example: LG24PH-00123456"
                                autoCapitalize="characters"
                              />
                              <div>
                                <button type="button" onClick={saveManufacturerSerial} disabled={savingSerial || !serialDraft.trim()}>
                                  {savingSerial ? "Saving..." : "Save real serial"}
                                </button>
                                <button type="button" className="serialqr-cancel" onClick={cancelSerialEdit} disabled={savingSerial}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" className="serialqr-edit" onClick={() => startSerialEdit(product, unit)}>
                              Set real serial
                            </button>
                          )
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!loading && filteredProducts.length > 0 ? (
        <div className="serialqr-pagination" aria-label="QR registry pagination">
          <span>Showing {firstProductIndex + 1}-{Math.min(firstProductIndex + pageSize, filteredProducts.length)} of {filteredProducts.length} models</span>
          <div>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
          </div>
        </div>
      ) : null}

      {!loading && filteredProducts.length === 0 ? (
        <div className="admin-card">No AC unit models matched your search.</div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminSerialQr;
