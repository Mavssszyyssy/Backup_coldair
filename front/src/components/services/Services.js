import {
  Broom,
  CheckCircle,
  Clock,
  Gear,
  MagnifyingGlass,
  ShieldCheck,
  WarningDiamond,
  Wrench,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import {
  BQ_COLORS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";
import ServiceBookingModal from "./ServiceBookingModal";
import "./Services.css";

const CATEGORY_ICONS = {
  maintenance: CheckCircle,
  repair: Wrench,
  cleaning: Broom,
  all: Gear,
};

function Services() {
  const navigate = useNavigate();
  const { isAuthenticated, showAuthRequiredPrompt } = useUser();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const categories = [
    { id: "all", name: "All Services", count: 6 },
    { id: "maintenance", name: "Maintenance", count: 2 },
    { id: "repair", name: "Repair", count: 2 },
    { id: "cleaning", name: "Cleaning", count: 2 },
  ];

  const services = [
    {
      id: 1,
      name: "Maintenance",
      icon: CheckCircle,
      description:
        "Regular check-ups and servicing for your AC to ensure optimal performance and energy efficiency.",
      duration: "1-2 hours",
      technicians: 2,
      price: 899,
      category: "maintenance",
      popular: true,
      warranty: "3 months",
      discount: "10% OFF",
    },
    {
      id: 2,
      name: "Repair",
      icon: Wrench,
      description:
        "AC repair services for any issues including compressor problems, refrigerant leaks, and electrical faults.",
      duration: "2-3 hours",
      technicians: 2,
      price: 1499,
      category: "repair",
      popular: true,
      warranty: "6 months",
      discount: null,
    },
    {
      id: 3,
      name: "Cleaning",
      icon: Broom,
      description:
        "Deep cleaning service to remove dirt, dust, mold, and bacteria from your AC unit.",
      duration: "1.5 hours",
      technicians: 1,
      price: 599,
      category: "cleaning",
      popular: false,
      warranty: "1 month",
      discount: "15% OFF",
    },
    {
      id: 4,
      name: "Emergency Repair",
      icon: WarningDiamond,
      description:
        "24/7 emergency AC repair service for urgent issues. Same-day response guaranteed.",
      duration: "2-3 hours",
      technicians: 2,
      price: 2499,
      category: "repair",
      popular: false,
      warranty: "3 months",
      discount: null,
    },
    {
      id: 5,
      name: "Premium Maintenance",
      icon: CheckCircle,
      description:
        "Comprehensive maintenance including filter replacement, coil cleaning, and performance tuning.",
      duration: "2-3 hours",
      technicians: 2,
      price: 1299,
      category: "maintenance",
      popular: true,
      warranty: "6 months",
      discount: "20% OFF",
    },
    {
      id: 6,
      name: "Sanitization Service",
      icon: ShieldCheck,
      description:
        "Anti-bacterial and anti-viral sanitization for your AC unit. Improves air quality.",
      duration: "1.5 hours",
      technicians: 1,
      price: 799,
      category: "cleaning",
      popular: false,
      warranty: "2 months",
      discount: null,
    },
  ];

  const handleBack = () => {
    navigate("/home");
  };

  const handleBookService = (service) => {
    if (!isAuthenticated) {
      showAuthRequiredPrompt("Please log in to book a service.");
      return;
    }
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = (service, bookingData) => {
    let technicianFee = 0;
    let technicianLabel = "";

    if (bookingData.technician === "senior") {
      technicianFee = 200;
      technicianLabel = "Senior Technician";
    } else if (bookingData.technician === "express") {
      technicianFee = 500;
      technicianLabel = "Express Service";
    } else {
      technicianLabel = "Standard Technician";
    }

    const totalPrice = service.price + technicianFee;

    const bookingDetails = {
      ...bookingData,
      service: service.name,
      basePrice: service.price,
      technicianFee: technicianFee,
      technicianLabel: technicianLabel,
      totalPrice: totalPrice,
      bookingId: Date.now(),
      status: "processing",
      warranty: service.warranty,
    };

    const existingBookings = localStorage.getItem("bookings");
    const bookings = existingBookings ? JSON.parse(existingBookings) : [];
    bookings.push(bookingDetails);
    localStorage.setItem("bookings", JSON.stringify(bookings));

    alert(
      `Booking confirmed!\n\nService: ${service.name}\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nTechnician: ${technicianLabel}\nTotal: ₱${totalPrice.toLocaleString()}\n\nWarranty: ${service.warranty}\nBooking ID: #${bookingDetails.bookingId}`,
    );

    setShowBookingModal(false);
    setSelectedService(null);
  };

  const getFilteredServices = () => {
    let filtered = services;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  };

  const filteredServices = getFilteredServices();

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      <BoutiqueHeader
        title="Professional Services"
        leftAction="back"
        onLeftAction={handleBack}
      />

      <BoutiqueBox
        direction="row"
        flex={1}
        width="100%"
        className="services-main"
      >
        {/* SIDEBAR */}
        <BoutiqueBox
          tag="aside"
          width={BQ_GEOMETRY.sidebarWidth}
          background={BQ_COLORS.bg}
          padding="24px 20px"
          style={{
            height: `calc(100vh - ${BQ_GEOMETRY.headerHeight})`,
            position: "sticky",
            top: BQ_GEOMETRY.headerHeight,
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <BoutiqueStack gap={32}>
            <BoutiqueStack gap={16}>
              <BoutiqueText
                variant="label"
                color={BQ_COLORS.inkMuted}
                style={{ letterSpacing: "0.2em", opacity: 0.8 }}
              >
                Categories
              </BoutiqueText>
              <BoutiqueStack
                gap={4}
                tag="ul"
                padding={0}
                margin={0}
                style={{ listStyle: "none" }}
              >
                {categories.map((cat) => {
                  const IconComp = CATEGORY_ICONS[cat.id] || Gear;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <BoutiqueBox
                      tag="li"
                      key={cat.id}
                      direction="row"
                      align="center"
                      justify="space-between"
                      padding="10px 16px"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        borderRadius: BQ_GEOMETRY.radiusPill,
                        cursor: "pointer",
                        transition: "all 0.4s ease",
                        background: isActive ? BQ_COLORS.brand : "transparent",
                        color: isActive ? "white" : BQ_COLORS.inkMuted,
                      }}
                    >
                      <BoutiqueBox direction="row" align="center" gap={12}>
                        <IconComp
                          size={20}
                          weight={isActive ? "fill" : "bold"}
                        />
                        <BoutiqueText size="14px" weight={700} color="inherit">
                          {cat.name}
                        </BoutiqueText>
                      </BoutiqueBox>
                      <BoutiqueText
                        size="11px"
                        weight={700}
                        padding="2px 8px"
                        style={{
                          background: isActive
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(0,0,0,0.05)",
                          borderRadius: "10px",
                        }}
                      >
                        {cat.count}
                      </BoutiqueText>
                    </BoutiqueBox>
                  );
                })}
              </BoutiqueStack>
            </BoutiqueStack>

            <BoutiqueStack gap={16}>
              <BoutiqueText
                variant="label"
                color={BQ_COLORS.inkMuted}
                style={{ letterSpacing: "0.2em", opacity: 0.8 }}
              >
                Assurance
              </BoutiqueText>
              <BoutiqueStack gap={12}>
                {[
                  "30-day service warranty",
                  "Certified technicians",
                  "Genuine spare parts",
                ].map((benefit, i) => (
                  <BoutiqueBox key={i} direction="row" align="center" gap={10}>
                    <CheckCircle
                      size={18}
                      weight="fill"
                      color={BQ_COLORS.success}
                    />
                    <BoutiqueText
                      size="13px"
                      weight={600}
                      color={BQ_COLORS.inkMuted}
                    >
                      {benefit}
                    </BoutiqueText>
                  </BoutiqueBox>
                ))}
              </BoutiqueStack>
            </BoutiqueStack>
          </BoutiqueStack>
        </BoutiqueBox>

        {/* CATALOGUE AREA */}
        <BoutiqueBox
          flex={1}
          background="white"
          style={{
            height: `calc(100vh - ${BQ_GEOMETRY.headerHeight})`,
            position: "sticky",
            top: BQ_GEOMETRY.headerHeight,
          }}
        >
          <BoutiqueBox
            flex={1}
            padding={32}
            style={{
              overflowY: "auto",
              borderLeft: `1px solid ${BQ_COLORS.border}`,
            }}
          >
            <BoutiqueBox
              direction="row"
              align="center"
              justify="space-between"
              padding="24px 0 12px"
              margin="-32px 0 32px"
              background="white"
              style={{
                position: "sticky",
                top: "-32px",
                zIndex: 100,
                borderBottom: "1px solid rgba(0,0,0,0.03)",
              }}
            >
              <BoutiqueText variant="label" color={BQ_COLORS.inkMuted}>
                Found {filteredServices.length}{" "}
                {filteredServices.length === 1 ? "service" : "services"}
              </BoutiqueText>
              <BoutiqueBox
                direction="row"
                align="center"
                gap={12}
                padding="8px 16px"
                background={BQ_COLORS.bg}
                style={{ borderRadius: BQ_GEOMETRY.radiusPill, width: "300px" }}
              >
                <MagnifyingGlass
                  size={18}
                  weight="bold"
                  color={BQ_COLORS.inkFaint}
                />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "14px",
                    width: "100%",
                  }}
                />
              </BoutiqueBox>
            </BoutiqueBox>

            {filteredServices.length === 0 ? (
              <BoutiqueBox
                align="center"
                justify="center"
                padding={60}
                color={BQ_COLORS.inkMuted}
              >
                <WarningDiamond size={48} weight="bold" />
                <BoutiqueText variant="h3" margin="16px 0 0">
                  No matching services found.
                </BoutiqueText>
              </BoutiqueBox>
            ) : (
              <BoutiqueGrid
                columns="repeat(auto-fill, minmax(340px, 1fr))"
                gap={24}
              >
                {filteredServices.map((service) => (
                  <BoutiqueCard
                    key={service.id}
                    padding={28}
                    style={{
                      position: "relative",
                      transition: "all 0.4s ease",
                    }}
                    className="service-card"
                  >
                    {service.discount && (
                      <BoutiqueBox
                        padding="4px 10px"
                        background={BQ_COLORS.danger}
                        color="white"
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          borderRadius: "6px",
                          zIndex: 10,
                        }}
                      >
                        <BoutiqueText size="10px" weight={800}>
                          {service.discount}
                        </BoutiqueText>
                      </BoutiqueBox>
                    )}

                    <BoutiqueBox
                      width={56}
                      height={56}
                      background={BQ_COLORS.bg}
                      color={BQ_COLORS.brand}
                      align="center"
                      justify="center"
                      margin="0 0 20px"
                      style={{ borderRadius: "16px" }}
                    >
                      <service.icon size={28} weight="bold" />
                    </BoutiqueBox>

                    <BoutiqueStack gap={8}>
                      <BoutiqueBox direction="row" align="center" gap={8}>
                        <BoutiqueText variant="h3">{service.name}</BoutiqueText>
                        {service.popular && (
                          <BoutiqueBox
                            padding="2px 8px"
                            background="#fff7ed"
                            color="#9a3412"
                            style={{ borderRadius: "10px" }}
                          >
                            <BoutiqueText
                              size="9px"
                              weight={800}
                              style={{ textTransform: "uppercase" }}
                            >
                              Popular
                            </BoutiqueText>
                          </BoutiqueBox>
                        )}
                      </BoutiqueBox>
                      <BoutiqueText
                        size="14px"
                        color={BQ_COLORS.inkMuted}
                        style={{ lineHeight: 1.6 }}
                      >
                        {service.description}
                      </BoutiqueText>
                    </BoutiqueStack>

                    <BoutiqueBox
                      direction="row"
                      align="center"
                      gap={16}
                      margin="20px 0"
                    >
                      <BoutiqueBox direction="row" align="center" gap={6}>
                        <Clock
                          size={16}
                          weight="bold"
                          color={BQ_COLORS.inkFaint}
                        />
                        <BoutiqueText size="12px" weight={600}>
                          {service.duration}
                        </BoutiqueText>
                      </BoutiqueBox>
                      <BoutiqueBox direction="row" align="center" gap={6}>
                        <ShieldCheck
                          size={16}
                          weight="bold"
                          color={BQ_COLORS.inkFaint}
                        />
                        <BoutiqueText size="12px" weight={600}>
                          {service.warranty}
                        </BoutiqueText>
                      </BoutiqueBox>
                    </BoutiqueBox>

                    <BoutiqueBox
                      direction="row"
                      align="center"
                      justify="space-between"
                      padding="20px 0 0"
                      style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
                    >
                      <BoutiqueText variant="h2" color={BQ_COLORS.brand}>
                        ₱{service.price.toLocaleString()}
                      </BoutiqueText>
                      <BoutiqueButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleBookService(service)}
                      >
                        Book Now
                      </BoutiqueButton>
                    </BoutiqueBox>
                  </BoutiqueCard>
                ))}
              </BoutiqueGrid>
            )}
          </BoutiqueBox>
        </BoutiqueBox>
      </BoutiqueBox>

      {showBookingModal && selectedService && (
        <ServiceBookingModal
          service={selectedService}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedService(null);
          }}
          onConfirm={handleConfirmBooking}
        />
      )}
      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .service-card:hover { transform: translateY(-6px); box-shadow: ${BQ_SHADOWS.hover}; border-color: ${BQ_COLORS.brand}; }
        @media (max-width: 1024px) {
          .services-main { flex-direction: column !important; }
          aside { width: 100% !important; height: auto !important; position: static !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default Services;
