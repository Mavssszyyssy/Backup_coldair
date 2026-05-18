const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    items: [
      {
        productId: { type: String, default: "" },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        specs: { type: String, default: "" },
      },
    ],
    address: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      postalCode: { type: String, default: "" },
    },
    paymentMethod: { type: String, default: "cod" },
    proofOfPayment: {
      imageUrl: { type: String, default: "" },
      status: {
        type: String,
        enum: ["none", "pending", "confirmed", "rejected"],
        default: "none",
      },
    },
    trackingNumber: { type: String, default: "" },
    estimatedDelivery: { type: String, default: "" },
    estimatedArrival: { type: String, default: "" },
    installationDate: { type: String, default: "" },
    assignedTechnician: { type: String, default: "" },
    customerBranch: { type: String, default: "" },
    stockSourceBranch: { type: String, default: "" },
    receipt: {
      receiptNumber: { type: String, default: "" },
      issuedAt: { type: String, default: "" },
      paymentMethod: { type: String, default: "" },
      amountPaid: { type: Number, default: 0 },
      itemsSummary: { type: String, default: "" },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    workflowStatus: {
      type: String,
      enum: ["to_pay", "to_deliver", "to_install", "complete", "cancelled"],
      default: "to_pay",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

orderSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Order", orderSchema);
