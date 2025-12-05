import React from "react";

const cardBase = {
  borderRadius: "1rem",
  padding: "1.25rem 1.5rem",
  boxShadow: "0 18px 45px rgba(15,23,42,0.35)",
  background: "#020617",
  border: "1px solid rgba(148,163,184,0.45)",
  color: "#e5e7eb"
};

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "2.5rem 1.5rem 3rem",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background:
          "radial-gradient(circle at top left,#1d3557,#0b1020 50%,#000)"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem"
        }}
      >
        <h1 style={{ color: "#f9fafb", margin: 0 }}>Espace rôles (MFE)</h1>
        <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.9rem" }}>
          À intégrer dans le shell principal via microfrontends.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem"
        }}
      >
        <section style={{ ...cardBase, borderColor: "#f97316" }}>
          <h2 style={{ marginTop: 0, color: "#fed7aa" }}>Administrateur</h2>
          <ul style={{ paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
            <li>Gestion des comptes Professeurs & Étudiants</li>
            <li>Configuration des programmes et des classes</li>
            <li>Vue globale des statistiques d’utilisation</li>
          </ul>
        </section>

        <section style={{ ...cardBase, borderColor: "#22c55e" }}>
          <h2 style={{ marginTop: 0, color: "#bbf7d0" }}>Professeur</h2>
          <ul style={{ paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
            <li>Gestion des cours et du contenu pédagogique</li>
            <li>Suivi des notes et de la progression</li>
            <li>Communication ciblée avec les étudiants</li>
          </ul>
        </section>

        <section style={{ ...cardBase, borderColor: "#3b82f6" }}>
          <h2 style={{ marginTop: 0, color: "#bfdbfe" }}>Étudiant</h2>
          <ul style={{ paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
            <li>Accès aux cours, supports et devoirs</li>
            <li>Vue sur les notes et le planning</li>
            <li>Messagerie avec les professeurs</li>
          </ul>
        </section>
      </div>
    </div>
  );
}


