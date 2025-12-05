import React, { useEffect, useState } from "react";

export default function App() {
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    // Écouter les messages depuis le parent (frontend-shell)
    const handleMessage = (event) => {
      if (!event.data || event.data.source !== 'frontend-shell') return;

      // Gérer l'initialisation de l'auth
      if (event.data.type === 'AUTH_INIT' || event.data.type === 'AUTH_UPDATE') {
        if (event.data.auth && event.data.auth.isAuthenticated) {
          setIsDisconnected(false);
        } else {
          setIsDisconnected(true);
        }
      }
      
      // Gérer la déconnexion
      if (event.data.type === 'LOGOUT') {
        setIsDisconnected(true);
        // Nettoyer les cookies d'authentification
        try {
          document.cookie = 'portal_auth_state=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        } catch (error) {
          console.warn('Could not clear auth cookie:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Demander l'auth au parent si on n'en a pas encore
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'AUTH_REQUEST', source: 'student-mfe' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (isDisconnected) {
    return (
      <div className="mfe-root" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          maxWidth: '28rem',
          width: '100%'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>Session expirée</h2>
          <p style={{
            color: '#4b5563',
            marginBottom: '1rem'
          }}>
            Vous avez été déconnecté. Veuillez vous reconnecter depuis le portail principal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mfe-root">
      <h1>Espace Étudiant</h1>
      <p>
        Cette application est un microfrontend indépendant, dédié à l&apos;étudiant.
      </p>
    </div>
  );
}


