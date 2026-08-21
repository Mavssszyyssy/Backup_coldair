import { Redirect } from "expo-router";

// QR verification is intentionally available only from an assigned work order.
export default function TechnicianQrRedirect() {
  return <Redirect href="/technician/tasks" />;
}
