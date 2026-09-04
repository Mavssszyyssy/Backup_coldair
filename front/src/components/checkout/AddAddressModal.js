import { useState } from 'react';
import {
  getRegions,
  getProvincesByRegion,
  getCitiesByProvince,
  getBarangaysByCity,
} from '../../domain/location/addressSelectors';
import {
  getSuggestedPostalCode,
  validatePostalCodeForAddress,
} from '../../domain/location/postalCodeValidation';

const PHONE_MAX_DIGITS = 11;

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);

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
  backendErrors = {}
}) {
  const [address, setAddress] = useState({
    type: initialAddress?.type || 'home',
    label: initialAddress?.label || '',
    name: initialAddress?.name || '',
    region: initialAddress?.region || '',
    province: initialAddress?.province || '',
    barangay: initialAddress?.barangay || '',
    street: initialAddress?.street || '',
    city: initialAddress?.city || '',
    postalCode: initialAddress?.postalCode || '',
    phone: initialAddress?.phone || '',
    isDefault: Boolean(initialAddress?.isDefault)
  });
  
  const [serverMessage, setServerMessage] = useState('');

  const regions = getRegions();
  const provinces = getProvincesByRegion(address.region);
  const cities = getCitiesByProvince(address.region, address.province);
  const barangays = getBarangaysByCity(address.region, address.province, address.city);

  const setAddressField = (field, value) => {
    setAddress((prev) => {
      if (field === 'region') {
        return { ...prev, region: value, province: '', city: '', barangay: '', postalCode: '' };
      }
      if (field === 'province') {
        return { ...prev, province: value, city: '', barangay: '', postalCode: '' };
      }
      if (field === 'city') {
        const nextAddress = { ...prev, city: value, barangay: '', postalCode: '' };
        return { ...nextAddress, postalCode: getSuggestedPostalCode(nextAddress) };
      }
      return { ...prev, [field]: value };
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="address-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {serverMessage && (
            <div className="form-error-message" style={{ marginBottom: '16px', color: '#d32f2f', fontSize: '14px' }}>
              {serverMessage}
            </div>
          )}
          <div className="form-group">
            <label>Label</label>
            <input
              type="text"
              placeholder="Home, Office, Condo"
              value={address.label}
              onChange={(e) => setAddress({ ...address, label: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Address Type</label>
            <select value={address.type} onChange={(e) => setAddressField('type', e.target.value)}>
              <option value="home">Home</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Recipient Name *</label>
            <input
              type="text"
              placeholder="Full name"
              value={address.name}
              onChange={(e) => setAddressField('name', e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Region *</label>
              <select value={address.region} onChange={(e) => setAddressField('region', e.target.value)}>
                <option value="">Select Region</option>
                {regions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Province *</label>
              <select value={address.province} onChange={(e) => setAddressField('province', e.target.value)} disabled={!address.region}>
                <option value="">Select Province</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City / Municipality *</label>
              <select value={address.city} onChange={(e) => setAddressField('city', e.target.value)} disabled={!address.province}>
                <option value="">Select City / Municipality</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Barangay *</label>
              <select value={address.barangay} onChange={(e) => setAddressField('barangay', e.target.value)} disabled={!address.city}>
                <option value="">Select Barangay</option>
                {barangays.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Street Address *</label>
            <input
              type="text"
              placeholder="House/Block/Lot No., Street"
              value={address.street}
              onChange={(e) => setAddressField('street', e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>ZIP Code *</label>
              <input
                type="text"
                placeholder="4-digit ZIP code"
                value={address.postalCode}
                maxLength={4}
                inputMode="numeric"
                autoComplete="postal-code"
                onChange={(e) => setAddressField('postalCode', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                placeholder="09XXXXXXXXX"
                value={address.phone}
                inputMode="numeric"
                maxLength={PHONE_MAX_DIGITS}
                onChange={(e) => setAddressField('phone', sanitizePhone(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={address.isDefault}
                onChange={(e) => setAddressField('isDefault', e.target.checked)}
              />
              Set as default delivery address
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="confirm-btn" onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Saving...' : saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default AddAddressModal;
