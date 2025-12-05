import React from "react";
import { useSelector } from "react-redux";

export default function StudentDashboard() {
  const auth = useSelector((state) => state.auth);

  return (
    <section className="auth-card">
      <h1 className="auth-title">Espace Étudiant</h1>
      <p className="auth-subtitle">
        Bonjour {auth.user?.firstName ?? ""} {auth.user?.lastName ?? ""}.
      </p>
      <p>
        Cet écran servira de point d’entrée pour les cours, les devoirs et le
        planning de l’étudiant.
      </p>
    </section>
  );
}


