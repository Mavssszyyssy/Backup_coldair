import React, { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import AdminLayout from "../Common/AdminLayout";
import { apiRequest } from "../../../config/api";
import "../adminShared.css";
import "./styles.css";

const getUnitLabel = (product, unit, index) =>
  `${product.sku || "AC"}-${String(index + 1).padStart(3, "0")} ${
    unit.branch ? `(${unit.branch})` : ""
  }`.trim();

const getTechnicianQrValue = (unit) => {
  const serial = encodeURIComponent(unit.serialNumber || "");
  if (typeof window === "undefined") return unit.qrCode || unit.serialNumber;
  return `${window.location.origin}/tech/field-registration?serial=${serial}`;
};

const AdminSerialQr = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      [
        product.name,
        product.brand,
        product.sku,
        product.specs,
        ...(product.serialUnits || []).map((unit) => unit.serialNumber),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [products, query]);

  const totalSerials = products.reduce(
    (sum, product) => sum + (product.serialUnits?.length || 0),
    0,
  );

  return (
    <AdminLayout
      title="Serial Numbers and QR Codes"
      subtitle="Scan these QR codes in the technician mobile app to open AC unit details."
    >
      <div className="serialqr-toolbar admin-card">
        <div>
          <h3>AC Unit QR Registry</h3>
          <p>
            {products.length} models with {totalSerials} generated serial
            numbers.
          </p>
        </div>
        <div className="serialqr-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search model, SKU, branch, or serial"
          />
          <button type="button" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <p className="serialqr-error">{error}</p> : null}
      {loading ? <div className="admin-card">Loading serial numbers...</div> : null}

      <div className="serialqr-model-list">
        {filteredProducts.map((product) => {
          const serialUnits = product.serialUnits || [];
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
                  {serialUnits.length} serials
                </span>
              </header>

              {serialUnits.length === 0 ? (
                <p>No serial numbers generated for this model yet.</p>
              ) : (
                <div className="serialqr-grid">
                  {serialUnits.map((unit, index) => (
                    <article className="serialqr-card" key={unit.serialNumber}>
                      <div className="serialqr-codebox">
                        <QRCodeCanvas
                          value={getTechnicianQrValue(unit)}
                          size={132}
                          level="M"
                          includeMargin
                        />
                      </div>
                      <div className="serialqr-card-body">
                        <strong>{getUnitLabel(product, unit, index)}</strong>
                        <code>{unit.serialNumber}</code>
                        <span>{unit.status || "available"}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!loading && filteredProducts.length === 0 ? (
        <div className="admin-card">No AC unit models matched your search.</div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminSerialQr;
