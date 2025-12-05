import React, { useMemo, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const auth = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  // Helper pour obtenir un cookie
  const getCookie = (name) => {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Vérifier l'authentification de manière réactive
  const isAuthenticated = useMemo(() => {
    // D'abord vérifier Redux
    if (auth.isAuthenticated && auth.user) {
      return true;
    }
    
    // Si pas dans Redux, vérifier les cookies
    try {
      const raw = getCookie("portal_auth_state");
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (parsed && typeof parsed === "object" && parsed.isAuthenticated && parsed.user) {
          return true;
        }
      }
    } catch {
      // ignore erreurs
    }
    
    return false;
  }, [auth.isAuthenticated, auth.user]);

  // Surveiller les changements d'authentification et rediriger si nécessaire
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Rediriger vers /login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

