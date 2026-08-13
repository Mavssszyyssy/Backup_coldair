import { useState } from "react";
// import icons from '../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

function ServiceBookingModal({ service, onClose, onConfirm }) {
  const [bookingData, setBookingData] = useState({
    date: "",
    time: "",
    address: "",
    notes: "",
    technician: "any",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!bookingData.date) newErrors.date = "Please select a date";
    else if (bookingData.date < today) newErrors.date = "Please select today or a future date";
    if (!bookingData.time) newErrors.time = "Please select a time";
    if (!bookingData.address) newErrors.address = "Please enter your address";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onConfirm(service, bookingData);
    }
  };

  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
  ];

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Calculate total price
  const getTotalPrice = () => {
    let extra = 0;
    if (bookingData.technician === "senior") extra = 200;
    if (bookingData.technician === "express") extra = 500;
    return service.price + extra;
  };

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Book Service</h3>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Service Info */}
          <div className="booking-info">
            <div className="booking-info-item">
              <span className="booking-label">Service:</span>
              <span className="booking-value">{service.name}</span>
            </div>
            <div className="booking-info-item">
              <span className="booking-label">Duration:</span>
              <span className="booking-value">{service.duration}</span>
            </div>
            <div className="booking-info-item">
              <span className="booking-label">Base Price:</span>
              <span className="booking-value">
                ₱{service.price.toLocaleString()}
              </span>
            </div>
            <div className="booking-info-item">
              <span className="booking-label">Warranty:</span>
              <span className="booking-value warranty-value">
                <img src={icons.lock} alt="" className="inline-icon" />{" "}
                {service.warranty}
              </span>
            </div>
          </div>

          {/* Date Selection */}
          <div className="form-group">
            <label>
              Select Date <span className="required">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={bookingData.date}
              onChange={(e) =>
                setBookingData({ ...bookingData, date: e.target.value })
              }
              className={errors.date ? "error" : ""}
            />
            {errors.date && <div className="error-message">{errors.date}</div>}
          </div>

          {/* Time Selection */}
          <div className="form-group">
            <label>
              Select Time <span className="required">*</span>
            </label>
            <select
              value={bookingData.time}
              onChange={(e) =>
                setBookingData({ ...bookingData, time: e.target.value })
              }
              className={errors.time ? "error" : ""}
            >
              <option value="">Select time slot</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
            {errors.time && <div className="error-message">{errors.time}</div>}
          </div>

          {/* Address */}
          <div className="form-group">
            <label>
              Service Address <span className="required">*</span>
            </label>
            <textarea
              rows="3"
              placeholder="Enter your complete address"
              value={bookingData.address}
              onChange={(e) =>
                setBookingData({ ...bookingData, address: e.target.value })
              }
              className={errors.address ? "error" : ""}
            />
            {errors.address && (
              <div className="error-message">{errors.address}</div>
            )}
          </div>

          {/* Technician Options */}
          <div className="form-group">
            <label>Preferred Technician</label>
            <select
              value={bookingData.technician}
              onChange={(e) =>
                setBookingData({ ...bookingData, technician: e.target.value })
              }
            >
              <option value="any">Any available technician (Included)</option>
              <option value="senior">Senior Technician (+₱200)</option>
              <option value="express">Express Service (+₱500)</option>
            </select>
            {bookingData.technician !== "any" && (
              <div className="tech-note">
                {bookingData.technician === "senior"
                  ? "Experienced technician with 5+ years experience"
                  : "Priority dispatch within 2 hours"}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="form-group">
            <label>Additional Notes (Optional)</label>
            <textarea
              rows="2"
              placeholder="Any special requests or instructions?"
              value={bookingData.notes}
              onChange={(e) =>
                setBookingData({ ...bookingData, notes: e.target.value })
              }
            />
          </div>
        </div>

        {/* Footer with price summary */}
        <div className="modal-footer">
          <div className="price-summary">
            <span>Total Amount:</span>
            <span className="total-price">
              ₱{getTotalPrice().toLocaleString()}
            </span>
          </div>
          <div className="footer-buttons">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="confirm-btn" onClick={handleSubmit}>
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceBookingModal;
