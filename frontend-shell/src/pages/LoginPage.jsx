import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
  email: yup
    .string()
    .required("L’e-mail est obligatoire.")
    .email("Format d’e-mail invalide."),
  password: yup
    .string()
    .required("Le mot de passe est obligatoire.")
    .min(8, "Au moins 8 caractères.")
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(schema) });

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

  // Vérifier si l'utilisateur est déjà connecté (Redux + cookies)
  const existingAuth = useMemo(() => {
    // 1) Redux
    if (auth?.isAuthenticated && auth?.user) {
      return { role: auth.role };
    }

    // 2) Cookies (au cas où Redux ne serait pas encore hydraté)
    try {
      const raw = getCookie("portal_auth_state");
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.isAuthenticated &&
          parsed.user
        ) {
          return { role: parsed.role };
        }
      }
    } catch {
      // ignore les erreurs d'accès / parsing
    }

    return null;
  }, [auth]);

  // Si déjà authentifié et qu'on arrive sur /login, rediriger vers le bon dashboard
  useEffect(() => {
    if (existingAuth?.role) {
      const role = existingAuth.role || "";
      const targetPath = role.includes("ADMIN") ? "/admin" : "/etudiant";
      navigate(targetPath, { replace: true });
    }
  }, [existingAuth, navigate]);

  const onSubmit = async (values) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.message ||
          "Identifiants invalides. Vérifiez votre e‑mail et votre mot de passe.";
        alert(message);
        return;
      }

      const userData = await response.json();

      const roles = Array.isArray(userData.roles) ? userData.roles : [];
      const primaryRole =
        roles.find((r) => r.includes("ADMIN")) ||
        roles.find((r) => r.includes("PROF")) ||
        roles.find((r) => r.includes("STUDENT")) ||
        "ROLE_STUDENT";

      dispatch(
        loginSuccess({
          user: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName
          },
          role: primaryRole,
          token: userData.token || null
        })
      );

      // Redirection en fonction du rôle (SPA, sans recharger la page)
      if (primaryRole.includes("ADMIN")) {
        navigate("/admin");
      } else {
        navigate("/etudiant");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau lors de la connexion.");
    }
  };

  return (
    <section className="auth-card">
      <h1 className="auth-title">Connexion</h1>
      <p className="auth-subtitle">
        Connectez-vous avec votre compte Administrateur, Prof ou Étudiant.
      </p>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="prenom.nom@exemple.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="field-error">{errors.email.message}</p>
          )}
        </div>

        <div className="field">
          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="field-error">{errors.password.message}</p>
          )}
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </button>

        <p className="auth-help">
          Pas encore de compte ?{" "}
          <a href="/register">Créer un compte</a>
        </p>
      </form>
    </section>
  );
}


