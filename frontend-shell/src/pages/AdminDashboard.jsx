import React from "react";
import { useSelector } from "react-redux";

export default function AdminDashboard() {
  const auth = useSelector((state) => state.auth);

  return (
    <section className="auth-card">
      <h1 className="auth-title">Tableau de bord Administrateur</h1>
      <p className="auth-subtitle">
        Bienvenue {auth.user?.firstName ?? "Admin"} {auth.user?.lastName ?? ""}.
      </p>
      <p>
        Ici tu pourras plus tard gérer les professeurs, les étudiants, les
        cours, etc.
      </p>
    </section>
  );
}


