import React from "react";
import { useDispatch } from "react-redux";
import { registerSuccess } from "../store";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
  firstName: yup.string().required("Le prénom est obligatoire."),
  lastName: yup.string().required("Le nom est obligatoire."),
  email: yup
    .string()
    .required("L’e-mail est obligatoire.")
    .email("Format d’e-mail invalide."),
  password: yup
    .string()
    .required("Le mot de passe est obligatoire.")
    .min(8, "Au moins 8 caractères.")
    .matches(/[A-Z]/, "Au moins une majuscule.")
    .matches(/[0-9]/, "Au moins un chiffre."),
  passwordConfirm: yup
    .string()
    .oneOf([yup.ref("password")], "Les mots de passe ne correspondent pas.")
    .required("La confirmation est obligatoire.")
});

export default function RegisterPage() {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (values) => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.errors?.join("\n") ||
          "Erreur lors de l’inscription. Vérifiez les informations.";
        alert(message);
        return;
      }

      const userData = await response.json();
      const roleFromApi =
        Array.isArray(userData.roles) && userData.roles.length > 0
          ? userData.roles[0]
          : "ROLE_STUDENT";

      dispatch(
        registerSuccess({
          user: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName
          },
          role: roleFromApi
        })
      );

      alert("Inscription réussie ! Vous êtes connecté en tant qu’étudiant.");
    } catch (e) {
      console.error(e);
      alert("Erreur réseau lors de l’inscription.");
    }
  };

  return (
    <section className="auth-card">
      <h1 className="auth-title">Créer un compte</h1>
      <p className="auth-subtitle">
        Créez un compte Étudiant pour accéder à la plateforme.
      </p>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field-row">
          <div className="field">
            <label>Prénom</label>
            <input type="text" placeholder="Fatima" {...register("firstName")} />
            {errors.firstName && (
              <p className="field-error">{errors.firstName.message}</p>
            )}
          </div>

          <div className="field">
            <label>Nom</label>
            <input type="text" placeholder="Ben Ali" {...register("lastName")} />
            {errors.lastName && (
              <p className="field-error">{errors.lastName.message}</p>
            )}
          </div>
        </div>

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

        <div className="field-row">
          <div className="field">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          <div className="field">
            <label>Confirmation</label>
            <input
              type="password"
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="field-error">{errors.passwordConfirm.message}</p>
            )}
          </div>
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Création du compte..." : "Créer le compte"}
        </button>

        <p className="auth-help">
          Vous avez déjà un compte ? <a href="/login">Se connecter</a>
        </p>
      </form>
    </section>
  );
}


