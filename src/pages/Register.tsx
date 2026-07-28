/** Register page — redirect to login */
import { Navigate } from "react-router";

export default function RegisterPage() {
  return <Navigate to="/login" replace />;
}
