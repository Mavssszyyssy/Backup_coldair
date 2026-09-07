import { Redirect } from "expo-router";
import { useUserContext } from "../../../context/UserContext";
import { requiredSetupRoute } from "../../../services/accountSetupRoute";

export default function TechnicianLegacySecurityRoute() {
  const { current } = useUserContext();
  return <Redirect href={requiredSetupRoute(current) || "/technician/home"} />;
}
