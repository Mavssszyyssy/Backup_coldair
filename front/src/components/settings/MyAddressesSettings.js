import { MapPin, Phone, Plus, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../config/api";
import AddAddressModal from "../checkout/AddAddressModal";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";

function MyAddressesSettings({ user }) {
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const loadAddresses = async () => {
    setAddressLoading(true);
    try {
      const result = await apiRequest("/users/addresses");
      setAddresses(result.addresses || []);
    } catch (_error) {
      setAddresses([]);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleSaveAddress = async (payload) => {
    setAddressSaving(true);
    try {
      if (editingAddress?.id || editingAddress?._id) {
        const id = editingAddress.id || editingAddress._id;
        await apiRequest(`/users/addresses/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/users/addresses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadAddresses();
      setAddressModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      alert(error.message || "Unable to save address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Delete this address?")) return;
    setAddressSaving(true);
    try {
      await apiRequest(`/users/addresses/${addressId}`, { method: "DELETE" });
      await loadAddresses();
    } catch (error) {
      alert(error.message || "Unable to delete address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    setAddressSaving(true);
    try {
      await apiRequest(`/users/addresses/${addressId}/default`, {
        method: "PATCH",
      });
      await loadAddresses();
    } catch (error) {
      alert(error.message || "Unable to update default address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const sortedAddresses = [...addresses].sort(
    (a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0),
  );

  return (
    <BoutiqueCard padding={32}>
      <BoutiqueStack gap={32}>
        <BoutiqueBox direction="row" align="center" justify="space-between">
          <BoutiqueBox direction="row" align="center" gap={12}>
            <BoutiqueBox
              width={40}
              height={40}
              background={BQ_COLORS.bg}
              align="center"
              justify="center"
              style={{ borderRadius: "12px", color: BQ_COLORS.brand }}
            >
              <MapPin size={20} weight="bold" />
            </BoutiqueBox>
            <BoutiqueStack gap={2}>
              <BoutiqueText variant="h2">My Addresses</BoutiqueText>
              <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                Manage your saved delivery locations.
              </BoutiqueText>
            </BoutiqueStack>
          </BoutiqueBox>
          <BoutiqueButton
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingAddress(null);
              setAddressModalOpen(true);
            }}
            style={{ width: "auto" }}
          >
            <Plus size={18} weight="bold" /> Add Address
          </BoutiqueButton>
        </BoutiqueBox>

        <BoutiqueStack gap={16}>
          {addressLoading && (
            <BoutiqueText
              align="center"
              padding="20px"
              color={BQ_COLORS.inkMuted}
            >
              Loading your addresses...
            </BoutiqueText>
          )}

          {!addressLoading && sortedAddresses.length === 0 && (
            <BoutiqueBox
              align="center"
              justify="center"
              padding={40}
              background={BQ_COLORS.bgAlt}
              style={{
                borderRadius: "16px",
                border: `1px dashed ${BQ_COLORS.border}`,
              }}
            >
              <BoutiqueText color={BQ_COLORS.inkMuted} weight={600}>
                No saved addresses yet.
              </BoutiqueText>
            </BoutiqueBox>
          )}

          <BoutiqueStack gap={16}>
            {sortedAddresses.map((address) => {
              const id = address.id || address._id;
              const fullAddress = [
                address.street,
                address.barangay,
                address.city,
                address.province,
                address.region,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <BoutiqueBox
                  key={id}
                  padding={24}
                  background="white"
                  style={{
                    borderRadius: "16px",
                    border: `1px solid ${address.isDefault ? BQ_COLORS.brand : BQ_COLORS.border}`,
                    boxShadow: address.isDefault ? BQ_SHADOWS.soft : "none",
                  }}
                >
                  <BoutiqueBox
                    direction="row"
                    justify="space-between"
                    align="flex-start"
                  >
                    <BoutiqueStack gap={8} flex={1}>
                      <BoutiqueBox direction="row" align="center" gap={12}>
                        <BoutiqueText weight={800} size="16px">
                          {address.label || address.type || "Address"}
                        </BoutiqueText>
                        {address.isDefault && (
                          <BoutiqueBox
                            padding="2px 8px"
                            background={BQ_COLORS.brand}
                            color="white"
                            style={{ borderRadius: "10px" }}
                          >
                            <BoutiqueText
                              size="9px"
                              weight={800}
                              style={{ textTransform: "uppercase" }}
                            >
                              Default
                            </BoutiqueText>
                          </BoutiqueBox>
                        )}
                      </BoutiqueBox>

                      <BoutiqueBox direction="row" align="center" gap={8}>
                        <Phone
                          size={14}
                          weight="bold"
                          color={BQ_COLORS.inkFaint}
                        />
                        <BoutiqueText
                          size="14px"
                          weight={600}
                          color={BQ_COLORS.inkMuted}
                        >
                          {address.name} · {address.phone}
                        </BoutiqueText>
                      </BoutiqueBox>

                      <BoutiqueBox direction="row" align="flex-start" gap={8}>
                        <MapPin
                          size={14}
                          weight="bold"
                          color={BQ_COLORS.inkFaint}
                          style={{ marginTop: "4px" }}
                        />
                        <BoutiqueText
                          size="13px"
                          color={BQ_COLORS.inkMuted}
                          style={{ lineHeight: 1.5 }}
                        >
                          {fullAddress || "No address line provided"}
                        </BoutiqueText>
                      </BoutiqueBox>
                    </BoutiqueStack>

                    <BoutiqueBox direction="row" gap={8}>
                      <BoutiqueButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAddress(address);
                          setAddressModalOpen(true);
                        }}
                        disabled={addressSaving}
                        style={{ width: "auto" }}
                      >
                        Edit
                      </BoutiqueButton>
                      {!address.isDefault && (
                        <BoutiqueButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefaultAddress(id)}
                          disabled={addressSaving}
                          style={{ width: "auto" }}
                        >
                          Set Default
                        </BoutiqueButton>
                      )}
                      <BoutiqueButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddress(id)}
                        disabled={addressSaving}
                        style={{ width: "auto", color: BQ_COLORS.danger }}
                      >
                        <Trash size={18} />
                      </BoutiqueButton>
                    </BoutiqueBox>
                  </BoutiqueBox>
                </BoutiqueBox>
              );
            })}
          </BoutiqueStack>
        </BoutiqueStack>
      </BoutiqueStack>

      {addressModalOpen && (
        <AddAddressModal
          onClose={() => {
            setAddressModalOpen(false);
            setEditingAddress(null);
          }}
          onSave={handleSaveAddress}
          initialAddress={editingAddress}
          title={editingAddress ? "Update Address" : "Add New Address"}
          saveLabel={editingAddress ? "Save Address" : "Add Address"}
          isSaving={addressSaving}
        />
      )}
    </BoutiqueCard>
  );
}

export default MyAddressesSettings;
