import { useEffect, useId, useState } from 'react';
import { psgcRegions, psgcProvinces, psgcLocalities, psgcBarangays, resolveSavedAddressCodes } from '../../domain/location/psgcAddressService';
import {
  getSuggestedPostalCode,
  validatePostalCodeForAddress,
} from '../../domain/location/postalCodeValidation';
import { translateText } from '../../utils/customerI18n';
import './AddAddressModal.css';

const PHONE_MAX_DIGITS = 11;

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
const includeSavedLocation = (options, savedValue) =>
  savedValue && !options.some((item) => item.name === savedValue) ? [{ name: savedValue, code: '' }, ...options] : options;

const validateAddress = (address) => {
  const errors = [];
  if (!address.name?.trim()) errors.push('Recipient name is required.');
  if (!address.region?.trim()) errors.push('Region is required.');
  if (!address.province?.trim()) errors.push('Province is required.');
  if (!address.barangay?.trim()) errors.push('Barangay is required.');
  if (!address.street?.trim()) errors.push('Street address is required.');
  if (!address.city?.trim()) errors.push('City is required.');
  if (!address.phone?.trim()) errors.push('Phone number is required.');

  const phoneDigits = sanitizePhone(address.phone || '');
  if (phoneDigits && !/^09\d{9}$/.test(phoneDigits)) {
    errors.push('Phone number must be a valid PH mobile format (09XXXXXXXXX).');
  }

  const postalCodeError = validatePostalCodeForAddress(address);
  if (postalCodeError) errors.push(postalCodeError);

  return errors;
};

function AddAddressModal({
  onClose,
  onSave,
  initialAddress = null,
  title = 'Add New Address',
  saveLabel = 'Save Address',
  isSaving = false,
  backendErrors = {},
  language = 'English',
}) {
  const t = (value) => translateText(value, language);
  const titleId = useId();
  const [address, setAddress] = useState({
    type: initialAddress?.type || 'home',
    label: initialAddress?.label || '',
    name: initialAddress?.name || '',
    region: initialAddress?.region || '',
    regionCode: initialAddress?.regionCode || '',
    province: initialAddress?.province || '',
    provinceCode: initialAddress?.provinceCode || '',
    barangay: initialAddress?.barangay || '',
    submunicipalityCode: initialAddress?.submunicipalityCode || '',
    street: initialAddress?.street || '',
    city: initialAddress?.city || '',
    municipalityCode: initialAddress?.municipalityCode || '',
    postalCode: initialAddress?.postalCode || '',
    phone: initialAddress?.phone || '',
    isDefault: Boolean(initialAddress?.isDefault)
  });
  
  const [serverMessage, setServerMessage] = useState('');
  const [regionsLoaded, setRegionsLoaded] = useState([]);
  const [provincesLoaded, setProvincesLoaded] = useState([]);
  const [citiesLoaded, setCitiesLoaded] = useState([]);
  const [barangaysLoaded, setBarangaysLoaded] = useState([]);
  const regions = includeSavedLocation(regionsLoaded, address.region);
  const provinces = includeSavedLocation(provincesLoaded, address.province);
  const cities = includeSavedLocation(citiesLoaded, address.city);
  const barangays = includeSavedLocation(barangaysLoaded, address.barangay);

  useEffect(() => {
    let active = true;
    psgcRegions().then((items) => { if (active) setRegionsLoaded(items); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setProvincesLoaded([]);
    if (address.region) psgcProvinces(address.regionCode, address.region).then((items) => { if (active) setProvincesLoaded(items); });
    return () => { active = false; };
  }, [address.region, address.regionCode]);
  useEffect(() => {
    let active = true;
    setCitiesLoaded([]);
    if (address.province) psgcLocalities(address.provinceCode, address.regionCode, address.region, address.province).then((items) => { if (active) setCitiesLoaded(items); });
    return () => { active = false; };
  }, [address.province, address.provinceCode, address.region, address.regionCode]);
  useEffect(() => {
    let active = true;
    setBarangaysLoaded([]);
    if (address.city) psgcBarangays(address.municipalityCode, address.region, address.province, address.city).then((items) => { if (active) setBarangaysLoaded(items); });
    return () => { active = false; };
  }, [address.city, address.municipalityCode, address.region, address.province]);
  useEffect(() => {
    if (!initialAddress || (initialAddress.regionCode && initialAddress.provinceCode && initialAddress.municipalityCode)) return undefined;
    let active = true;
    resolveSavedAddressCodes(initialAddress).then((codes) => {
      if (active) setAddress((previous) => previous.region === initialAddress.region && previous.province === initialAddress.province && previous.city === initialAddress.city
        ? { ...previous, ...Object.fromEntries(Object.entries(codes).filter(([, code]) => code)) }
        : previous);
    });
    return () => { active = false; };
  }, [initialAddress]);

  const setAddressField = (field, value) => {
    if (serverMessage) setServerMessage('');
    setAddress((prev) => {
      if (field === 'region') {
        return { ...prev, region: value, regionCode: regions.find((item) => item.name === value)?.code || '', province: '', provinceCode: '', city: '', municipalityCode: '', barangay: '', submunicipalityCode: '', postalCode: '' };
      }
      if (field === 'province') {
        return { ...prev, province: value, provinceCode: provinces.find((item) => item.name === value)?.code || '', city: '', municipalityCode: '', barangay: '', submunicipalityCode: '', postalCode: '' };
      }
      if (field === 'city') {
        const nextAddress = { ...prev, city: value, municipalityCode: cities.find((item) => item.name === value)?.code || '', barangay: '', submunicipalityCode: '', postalCode: '' };
        return { ...nextAddress, postalCode: getSuggestedPostalCode(nextAddress) };
      }
      return { ...prev, [field]: value, ...(field === 'barangay' ? { submunicipalityCode: barangays.find((item) => item.name === value)?.code || '' } : {}) };
    });
  };
  const handleSubmit = () => {
    const normalized = {
      ...address,
      name: address.name.trim(),
      region: address.region.trim(),
      province: address.province.trim(),
      barangay: address.barangay.trim(),
      street: address.street.trim(),
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
      phone: sanitizePhone(address.phone)
    };
    const errors = validateAddress(normalized);
    if (errors.length > 0) {
      setServerMessage(errors[0]);
      return;
    }
    
    // Clear messages before submission; onSave will handle backend errors
    setServerMessage('');
    onSave(normalized);
  };

  return (
    <div className="address-editor-overlay" onClick={onClose}>
      <section
        className="address-editor-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="address-editor-header">
          <div>
            <span className="address-editor-eyebrow">{t('Delivery address')}</span>
            <h2 id={titleId}>{t(title)}</h2>
          </div>
          <button
            type="button"
            className="address-editor-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label={t('Close address form')}
          >
            ×
          </button>
        </header>
        <div className={`address-editor-alert-region${serverMessage ? ' address-editor-alert-region--visible' : ''}`}>
          {serverMessage && (
            <div className="address-editor-error" role="alert">
              <span className="address-editor-error-icon" aria-hidden="true">!</span>
              <div className="address-editor-error-copy">
                <strong>{t('Please check this address')}</strong>
                <span>{t(serverMessage)}</span>
              </div>
              <button
                type="button"
                className="address-editor-error-dismiss"
                onClick={() => setServerMessage('')}
                aria-label={t('Dismiss address error')}
              >
                ×
              </button>
            </div>
          )}
        </div>
        <div className="address-editor-body">
          <div className="address-editor-field">
            <label htmlFor="address-editor-label">{t('Label')}</label>
            <input
              id="address-editor-label"
              type="text"
              placeholder="Home, Office, Condo"
              value={address.label}
              onChange={(e) => setAddressField('label', e.target.value)}
            />
          </div>
          <div className="address-editor-field">
            <label htmlFor="address-editor-type">{t('Address Type')}</label>
            <select id="address-editor-type" value={address.type} onChange={(e) => setAddressField('type', e.target.value)}>
              <option value="home">{t('Home')}</option>
              <option value="office">{t('Office')}</option>
              <option value="other">{t('Other')}</option>
            </select>
          </div>
          <div className="address-editor-field">
            <label htmlFor="address-editor-name">{t('Recipient Name')} *</label>
            <input
              id="address-editor-name"
              type="text"
              placeholder="Full name"
              value={address.name}
              onChange={(e) => setAddressField('name', e.target.value)}
            />
          </div>
          <div className="address-editor-grid">
            <div className="address-editor-field">
              <label htmlFor="address-editor-region">{t('Region')} *</label>
              <select id="address-editor-region" value={address.region} onChange={(e) => setAddressField('region', e.target.value)}>
                <option value="">{t('Select Region')}</option>
                {regions.map((region) => (
                  <option key={region.code || region.name} value={region.name}>{region.name}</option>
                ))}
              </select>
            </div>
            <div className="address-editor-field">
              <label htmlFor="address-editor-province">{t('Province')} *</label>
              <select id="address-editor-province" value={address.province} onChange={(e) => setAddressField('province', e.target.value)} disabled={!address.region}>
                <option value="">{t('Select Province')}</option>
                {provinces.map((province) => (
                  <option key={province.code || province.name} value={province.name}>{province.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="address-editor-grid">
            <div className="address-editor-field">
              <label htmlFor="address-editor-city">{t('City / Municipality')} *</label>
              <select id="address-editor-city" value={address.city} onChange={(e) => setAddressField('city', e.target.value)} disabled={!address.province}>
                <option value="">{t('Select City / Municipality')}</option>
                {cities.map((city) => (
                  <option key={city.code || city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>
            <div className="address-editor-field">
              <label htmlFor="address-editor-barangay">{t('Barangay')} *</label>
              <select id="address-editor-barangay" value={address.barangay} onChange={(e) => setAddressField('barangay', e.target.value)} disabled={!address.city}>
                <option value="">{t('Select Barangay')}</option>
                {barangays.map((barangay) => (
                  <option key={barangay.code || barangay.name} value={barangay.name}>{barangay.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="address-editor-field">
            <label htmlFor="address-editor-street">{t('Street Address')} *</label>
            <input
              id="address-editor-street"
              type="text"
              placeholder="House/Block/Lot No., Street"
              value={address.street}
              onChange={(e) => setAddressField('street', e.target.value)}
            />
          </div>
          <div className="address-editor-grid">
            <div className="address-editor-field">
              <label htmlFor="address-editor-zip">{t('ZIP Code')} *</label>
              <input
                id="address-editor-zip"
                type="text"
                placeholder="4-digit ZIP code"
                value={address.postalCode}
                maxLength={4}
                inputMode="numeric"
                autoComplete="postal-code"
                onChange={(e) => setAddressField('postalCode', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <div className="address-editor-field">
              <label htmlFor="address-editor-phone">{t('Phone Number')} *</label>
              <input
                id="address-editor-phone"
                type="tel"
                placeholder="09XXXXXXXXX"
                value={address.phone}
                inputMode="numeric"
                maxLength={PHONE_MAX_DIGITS}
                onChange={(e) => setAddressField('phone', sanitizePhone(e.target.value))}
              />
            </div>
          </div>
          <div className="address-editor-default">
            <label>
              <input
                type="checkbox"
                checked={address.isDefault}
                onChange={(e) => setAddressField('isDefault', e.target.checked)}
              />
              {t('Set as default delivery address')}
            </label>
          </div>
        </div>
        <footer className="address-editor-footer">
          <button
            type="button"
            className="address-editor-button address-editor-button--secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('Cancel')}
          </button>
          <button
            type="button"
            className="address-editor-button address-editor-button--primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? t('Saving...') : t(saveLabel)}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default AddAddressModal;
