import { Navigate } from "react-router-dom";

interface ClerkDefaultAuthProps {
  initialMode: "signin" | "signup";
  role?: "organization" | "agent" | "customer";
}

export default function ClerkDefaultAuth({ initialMode }: ClerkDefaultAuthProps) {
  if (initialMode === "signup") {
    return <Navigate to="/auth/sign-up" replace />;
  }
  return <Navigate to="/auth/sign-in" replace />;
}
