import { CheckCircle, Copy, Package, Plus, QrCode } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { apiRequest } from "../../../config/api";
import { BRANCHES } from "../../../domain/branches/branches";

const INITIAL_FORM = {
  name: "",
  sku: "",
  brand: "",
  category: "split",
  specs: "",
  description: "",
  image: "",
  features: "",
  price: "",
  threshold: "",
  branch: BRANCHES[0] || "",
  quantity: "",
};

const productSerials = (product) =>
  (Array.isArray(product?.serialUnits) ? product.serialUnits : [])
    .filter((unit) => unit?.serialNumber)
    .map((unit) => ({
      serialNumber: String(unit.serialNumber),
      qrUnitId: String(unit.qrUnitId || ""),
      branch: String(unit.branch || ""),
    }));

export default function SuperAdminCatalog({ onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdProduct, setCreatedProduct] = useState(null);
  const [copied, setCopied] = useState("");

  const serials = useMemo(() => productSerials(createdProduct), [createdProduct]);
  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const copySerial = async (serial) => {
    try {
      await navigator.clipboard.writeText(serial);
      setCopied(serial);
    } catch (_error) {
      setCopied("");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const price = Number(form.price);
    const threshold = form.threshold === "" ? 0 : Number(form.threshold);

    if (!form.name.trim() || !form.sku.trim() || !form.brand.trim() || !form.specs.trim()) {
      setError("Enter the product name, SKU, brand, and AC specification.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Starting stock must be a whole number of at least 1 so a serial number can be created for every unit.");
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(threshold) || threshold < 0) {
      setError("Enter a valid non-negative price and low-stock alert level.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim(),
          brand: form.brand.trim(),
          category: form.category,
          specs: form.specs.trim(),
          description: form.description.trim(),
          image: form.image.trim(),
          features: form.features.split(",").map((item) => item.trim()).filter(Boolean),
          price,
          threshold,
          branchStock: { [form.branch]: quantity },
        }),
      });
      setCreatedProduct(result.product || null);
      onCreated?.(result.product);
      setForm((current) => ({ ...INITIAL_FORM, branch: current.branch }));
    } catch (requestError) {
      setError(requestError?.message || "The product could not be added.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="super-catalog" aria-labelledby="shop-catalog-title">
      <div className="super-catalog-intro">
        <div>
          <span className="super-catalog-eyebrow">Shop catalog</span>
          <h2 id="shop-catalog-title">Add a product and its first stock</h2>
          <p>Each unit in the starting stock receives its own generated inventory serial number and permanent QR Unit ID for the chosen branch.</p>
        </div>
        <div className="super-catalog-rule"><QrCode size={22} weight="fill" /> Serial count matches starting stock</div>
      </div>

      <form className="super-catalog-form" onSubmit={submit}>
        <div className="super-catalog-section">
          <div className="super-catalog-section-heading"><Package size={20} weight="fill" /><div><h3>Product details</h3><p>These details are shown to customers in the shop.</p></div></div>
          <div className="super-catalog-grid">
            <label>Product name<input value={form.name} onChange={(event) => updateField("name", event.target.value)} required /></label>
            <label>SKU<input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} required /></label>
            <label>Brand<input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} required /></label>
            <label>AC type<select value={form.category} onChange={(event) => updateField("category", event.target.value)}><option value="split">Split type</option><option value="window">Window type</option><option value="floor">Floor mounted</option></select></label>
            <label>AC specification<input value={form.specs} onChange={(event) => updateField("specs", event.target.value)} placeholder="Example: 1.5 HP" required /></label>
            <label>Price (PHP)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} required /></label>
            <label>Low-stock alert level<input type="number" min="0" step="1" value={form.threshold} onChange={(event) => updateField("threshold", event.target.value)} placeholder="Optional" /></label>
            <label>Image URL <span>(optional)</span><input type="url" value={form.image} onChange={(event) => updateField("image", event.target.value)} placeholder="https://…" /></label>
            <label className="super-catalog-wide">Customer description <span>(optional)</span><textarea rows="3" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe this AC unit in customer-friendly language" /></label>
            <label className="super-catalog-wide">Features <span>(optional, separated by commas)</span><input value={form.features} onChange={(event) => updateField("features", event.target.value)} placeholder="Inverter, quiet operation, energy saving" /></label>
          </div>
        </div>

        <div className="super-catalog-section">
          <div className="super-catalog-section-heading"><QrCode size={20} weight="fill" /><div><h3>Starting stock and serials</h3><p>The system assigns this stock to one branch and generates one serial per unit.</p></div></div>
          <div className="super-catalog-grid super-catalog-stock-grid">
            <label>Branch<select value={form.branch} onChange={(event) => updateField("branch", event.target.value)}>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
            <label>Starting stock<input type="number" min="1" step="1" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} required /></label>
          </div>
          <p className="super-catalog-note">Generated serials are inventory identifiers. A Superadmin can later replace a generated serial with the unit’s real manufacturer serial in the Serial / QR Registry without changing its QR Unit ID.</p>
        </div>

        {error ? <p className="super-catalog-error" role="alert">{error}</p> : null}
        <button className="super-catalog-submit" type="submit" disabled={saving}><Plus size={20} weight="bold" />{saving ? "Adding product…" : "Add product and generate serials"}</button>
      </form>

      {createdProduct ? (
        <section className="super-catalog-success" aria-live="polite">
          <div className="super-catalog-success-heading"><CheckCircle size={24} weight="fill" /><div><h3>{createdProduct.name} is in the shop catalog</h3><p>{serials.length} generated serial{serials.length === 1 ? "" : "s"} assigned to {form.branch || "the selected branch"}.</p></div></div>
          {serials.length ? <div className="super-catalog-serial-list">{serials.map((unit) => <article key={unit.qrUnitId || unit.serialNumber}><div><span>Inventory serial</span><strong>{unit.serialNumber}</strong><small>QR Unit ID: {unit.qrUnitId || "Creating QR Unit ID"}</small></div><button type="button" onClick={() => void copySerial(unit.serialNumber)} aria-label={`Copy serial ${unit.serialNumber}`}><Copy size={17} weight="bold" />{copied === unit.serialNumber ? "Copied" : "Copy"}</button></article>)}</div> : <p className="super-catalog-error">The product was created but no serials were returned. Refresh the Serial / QR Registry before assigning this product.</p>}
        </section>
      ) : null}
    </section>
  );
}
