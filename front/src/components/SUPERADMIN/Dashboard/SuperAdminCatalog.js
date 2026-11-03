import { CheckCircle, Copy, Package, Plus, QrCode } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../config/api";
import useActiveBranches from "../../../domain/branches/useActiveBranches";
import { useUser } from "../../../context/UserContext";
import { translateText } from "../../../utils/customerI18n";

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
  branch: "",
  quantity: "",
};
const CATALOG_PAGE_SIZE = 10;

const productSerials = (product) =>
  (Array.isArray(product?.serialUnits) ? product.serialUnits : [])
    .filter((unit) => unit?.serialNumber)
    .map((unit) => ({
      serialNumber: String(unit.serialNumber),
      qrUnitId: String(unit.qrUnitId || ""),
      branch: String(unit.branch || ""),
    }));

export default function SuperAdminCatalog({ onCreated }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const branchNames = useActiveBranches();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdProduct, setCreatedProduct] = useState(null);
  const [copied, setCopied] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSort, setCatalogSort] = useState("name");
  const [catalogPage, setCatalogPage] = useState(1);
  const [changingProductId, setChangingProductId] = useState("");
  useEffect(() => {
    if (branchNames.length && !branchNames.includes(form.branch)) setForm((current) => ({ ...current, branch: branchNames[0] }));
  }, [branchNames, form.branch]);

  const loadCatalog = useCallback(async () => {
    const result = await apiRequest('/products?includeArchived=true');
    setAllProducts(Array.isArray(result.products) ? result.products : []);
  }, []);
  useEffect(() => { loadCatalog().catch((requestError) => setError(requestError.message || 'Unable to load product catalog.')); }, [loadCatalog]);
  const listedProducts = useMemo(() => allProducts.filter((product) =>
    (showArchived ? product.isActive === false : product.isActive !== false)
    && `${product.name} ${product.brand || ''} ${product.sku}`.toLowerCase().includes(catalogSearch.trim().toLowerCase()))
    .sort((left, right) => catalogSort === "stock"
      ? Number(left.stock || 0) - Number(right.stock || 0) || String(left.name || "").localeCompare(String(right.name || ""))
      : String(left.name || "").localeCompare(String(right.name || ""))),
  [allProducts, catalogSearch, catalogSort, showArchived]);
  const catalogPages = Math.max(1, Math.ceil(listedProducts.length / CATALOG_PAGE_SIZE));
  const visibleProducts = listedProducts.slice((catalogPage - 1) * CATALOG_PAGE_SIZE, catalogPage * CATALOG_PAGE_SIZE);
  useEffect(() => { if (catalogPage > catalogPages) setCatalogPage(catalogPages); }, [catalogPage, catalogPages]);

  const changeArchiveState = async (product, archive) => {
    if (archive && !window.confirm(`${t('Archive')} ${product.name}? ${t('It will disappear from the customer shop, but stock and history will be retained.')}`)) return;
    setChangingProductId(product.id); setError('');
    try {
      await apiRequest(`/products/${product.id}/${archive ? 'archive' : 'restore'}`, { method: 'PATCH' });
      await loadCatalog();
      onCreated?.();
    } catch (requestError) { setError(requestError.message || 'Unable to update product status.'); }
    finally { setChangingProductId(''); }
  };

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
      setError(t("Enter the product name, SKU, brand, and AC specification."));
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError(t("Starting stock must be a whole number of at least 1 so a serial number can be created for every unit."));
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(threshold) || threshold < 0) {
      setError(t("Enter a valid non-negative price and low-stock alert level."));
      return;
    }
    if (!branchNames.includes(form.branch)) { setError(t('Select an active branch.')); return; }

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
      await loadCatalog();
      setForm((current) => ({ ...INITIAL_FORM, branch: current.branch }));
    } catch (requestError) {
      setError(requestError?.message || t("The product could not be added."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="super-catalog" aria-labelledby="shop-catalog-title">
      <div className="super-catalog-intro">
        <div>
          <span className="super-catalog-eyebrow">{t('Catalog Management')}</span>
          <h2 id="shop-catalog-title">{t('Add a product and its first stock')}</h2>
          <p>{t('Each unit in the starting stock receives its own generated inventory serial number and permanent QR Unit ID for the chosen branch.')}</p>
        </div>
        <div className="super-catalog-rule"><QrCode size={22} weight="fill" /> {t('Serial count matches starting stock')}</div>
      </div>

      <section className="super-catalog-section" aria-label={t('Product archive management')}>
        <div className="super-catalog-section-heading"><Package size={20} weight="fill" /><div><h3>{t('Manage products')}</h3><p>{t('Switch between active and archived products. Archiving keeps stock and sales history while preventing new purchases.')}</p></div></div>
        <div className="super-catalog-archive-controls">
          <div role="group" aria-label={t('Product status')}>
            <button type="button" aria-pressed={!showArchived} className={!showArchived ? 'active' : ''} onClick={() => { setShowArchived(false); setCatalogPage(1); }}>{t('Active Products')}</button>
            <button type="button" aria-pressed={showArchived} className={showArchived ? 'active' : ''} onClick={() => { setShowArchived(true); setCatalogPage(1); }}>{t('Archived Products')}</button>
          </div>
          <label>{t('Search products')}<input type="search" value={catalogSearch} onChange={(event) => { setCatalogSearch(event.target.value); setCatalogPage(1); }} placeholder={t('Name, brand, or SKU')} /></label>
          <label>{t('Sort products')}<select value={catalogSort} onChange={(event) => { setCatalogSort(event.target.value); setCatalogPage(1); }}><option value="name">{t('Name A–Z')}</option><option value="stock">{t('Lowest stock first')}</option></select></label>
        </div>
        <div className="super-catalog-product-list">
          {visibleProducts.map((product) => <article key={product.id} className="super-catalog-product-row"><div><strong>{product.name}</strong><small>{product.brand ? `${product.brand} · ` : ''}{product.sku} · {t(product.isActive === false ? 'Archived' : 'Active')} · {Number(product.stock || 0)} {t('units retained')}</small></div><button type="button" disabled={changingProductId === product.id} onClick={() => changeArchiveState(product, product.isActive !== false)}>{t(changingProductId === product.id ? 'Saving…' : product.isActive === false ? 'Restore' : 'Archive')}</button></article>)}
          {!listedProducts.length ? <p>{t('No')} {t(showArchived ? 'archived' : 'active')} {t('products match this search.')}</p> : null}
        </div>
        {catalogPages > 1 ? <nav className="super-catalog-pagination" aria-label={t('Product pages')}><button type="button" disabled={catalogPage === 1} onClick={() => setCatalogPage((current) => current - 1)}>{t('Previous')}</button><span>{t('Page')} {catalogPage} {t('of')} {catalogPages}</span><button type="button" disabled={catalogPage === catalogPages} onClick={() => setCatalogPage((current) => current + 1)}>{t('Next')}</button></nav> : null}
      </section>

      <form className="super-catalog-form" onSubmit={submit}>
        <div className="super-catalog-section">
          <div className="super-catalog-section-heading"><Package size={20} weight="fill" /><div><h3>{t('Product details')}</h3><p>{t('These details are shown to customers in the shop.')}</p></div></div>
          <div className="super-catalog-grid">
            <label>{t('Product name')}<input value={form.name} onChange={(event) => updateField("name", event.target.value)} required /></label>
            <label>SKU<input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} required /></label>
            <label>{t('Brand')}<input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} required /></label>
            <label>{t('AC type')}<select value={form.category} onChange={(event) => updateField("category", event.target.value)}><option value="split">{t('Split type')}</option><option value="window">{t('Window type')}</option><option value="floor">{t('Floor mounted')}</option></select></label>
            <label>{t('AC specification')}<input value={form.specs} onChange={(event) => updateField("specs", event.target.value)} placeholder={t('Example: 1.5 HP')} required /></label>
            <label>{t('Price (PHP)')}<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} required /></label>
            <label>{t('Low-stock alert level')}<input type="number" min="0" step="1" value={form.threshold} onChange={(event) => updateField("threshold", event.target.value)} placeholder={t('Optional')} /></label>
            <label>{t('Image URL')} <span>{t('(optional)')}</span><input type="url" value={form.image} onChange={(event) => updateField("image", event.target.value)} placeholder="https://…" /></label>
            <label className="super-catalog-wide">{t('Customer description')} <span>{t('(optional)')}</span><textarea rows="3" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder={t('Describe this AC unit in customer-friendly language')} /></label>
            <label className="super-catalog-wide">{t('Features')} <span>{t('(optional, separated by commas)')}</span><input value={form.features} onChange={(event) => updateField("features", event.target.value)} placeholder={t('Inverter, quiet operation, energy saving')} /></label>
          </div>
        </div>

        <div className="super-catalog-section">
          <div className="super-catalog-section-heading"><QrCode size={20} weight="fill" /><div><h3>{t('Starting stock and serials')}</h3><p>{t('The system assigns this stock to one branch and generates one serial per unit.')}</p></div></div>
          <div className="super-catalog-grid super-catalog-stock-grid">
            <label>{t('Branch')}<select value={form.branch} onChange={(event) => updateField("branch", event.target.value)}>{branchNames.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
            <label>{t('Starting stock')}<input type="number" min="1" step="1" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} required /></label>
          </div>
          <p className="super-catalog-note">{t('Generated serials are inventory identifiers. A Superadmin can later replace a generated serial with the unit’s real manufacturer serial in the Serial / QR Registry without changing its QR Unit ID.')}</p>
        </div>

        {error ? <p className="super-catalog-error" role="alert">{error}</p> : null}
        <button className="super-catalog-submit" type="submit" disabled={saving}><Plus size={20} weight="bold" />{t(saving ? "Adding product…" : "Add product and generate serials")}</button>
      </form>

      {createdProduct ? (
        <section className="super-catalog-success" aria-live="polite">
          <div className="super-catalog-success-heading"><CheckCircle size={24} weight="fill" /><div><h3>{createdProduct.name} {t('was added to Catalog Management')}</h3><p>{serials.length} {t('generated serials assigned to')} {form.branch || t('the selected branch')}.</p></div></div>
          {serials.length ? <div className="super-catalog-serial-list">{serials.map((unit) => <article key={unit.qrUnitId || unit.serialNumber}><div><span>{t('Inventory serial')}</span><strong>{unit.serialNumber}</strong><small>{t('QR Unit ID')}: {unit.qrUnitId || t('Creating QR Unit ID')}</small></div><button type="button" onClick={() => void copySerial(unit.serialNumber)} aria-label={`${t('Copy serial')} ${unit.serialNumber}`}><Copy size={17} weight="bold" />{t(copied === unit.serialNumber ? 'Copied' : 'Copy')}</button></article>)}</div> : <p className="super-catalog-error">{t('The product was created but no serials were returned. Refresh the Serial / QR Registry before assigning this product.')}</p>}
        </section>
      ) : null}
    </section>
  );
}
