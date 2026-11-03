import { useUser } from "../../context/UserContext";
import { translateText } from "../../utils/customerI18n";
// import icons from '../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

function DeliveryAddress({
  addresses,
  selectedAddress,
  onSelectAddress,
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  isBusy,
}) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const formatAddressOption = (address) => {
    const tag =
      address.label?.trim() ||
      (address.type === "home"
        ? t("Home")
        : address.type === "office"
          ? t("Office")
          : t("Address"));
    const city = address.city?.trim() || t("No city");
    return `${tag} - ${city}`;
  };

  const selectedValue = selectedAddress?.id || "";

  const handleSelection = (event) => {
    const next = addresses.find((item) => item.id === event.target.value);
    if (next) onSelectAddress(next);
  };

  return (
    <div className="checkout-section">
      <div className="section-header">
        <h2>{t("Delivery Address")}</h2>
        <button type="button" className="add-btn" onClick={onAddAddress}>
          + {t("Add New Address")}
        </button>
      </div>
      {addresses.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px", color: "#999" }}>
          {t('No saved addresses. Click "Add New Address" to continue.')}
        </div>
      )}

      {addresses.length > 0 && (
        <>
          <div className="address-select-wrap">
            <label htmlFor="saved-address-select">{t("Saved Address")}</label>
            <select
              id="saved-address-select"
              value={selectedValue}
              onChange={handleSelection}
              className="address-select"
              disabled={isBusy}
            >
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {formatAddressOption(address)}
                </option>
              ))}
            </select>
          </div>

          {selectedAddress && (
            <div className="address-card selected">
              <div className="address-type">
                <span>
                  <img src={icons.marker} alt="" className="inline-icon" />{" "}
                  {formatAddressOption(selectedAddress)}
                </span>
                {selectedAddress.isDefault && (
                  <span className="default-tag">{t("Default")}</span>
                )}
              </div>
              <div className="address-details">
                <p>
                  <strong>{selectedAddress.name}</strong>
                </p>
                <p>{selectedAddress.street}</p>
                <p>
                  {selectedAddress.city}, {selectedAddress.postalCode || "N/A"}
                </p>
                <p>
                  <img src={icons.phoneCall} alt="" className="inline-icon" />{" "}
                  {selectedAddress.phone}
                </p>
              </div>

              <div className="address-actions-row">
                {!selectedAddress.isDefault && (
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => onSetDefaultAddress(selectedAddress)}
                    disabled={isBusy}
                  >
                    {t("Set Default")}
                  </button>
                )}
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => onEditAddress(selectedAddress)}
                  disabled={isBusy}
                >
                  {t("Edit")}
                </button>
                <button
                  type="button"
                  className="add-btn danger"
                  onClick={() => onDeleteAddress(selectedAddress)}
                  disabled={isBusy}
                >
                  {t("Delete")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DeliveryAddress;
