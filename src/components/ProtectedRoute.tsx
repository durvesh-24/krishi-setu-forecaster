import { Navigate } from "react-router-dom";
import { getFarmer } from "@/lib/user";

/** Send visitors who are not logged in back to the login page. */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) =>
  getFarmer() ? <>{children}</> : <Navigate to="/" replace />;

export default ProtectedRoute;
