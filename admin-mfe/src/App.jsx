import React, { useEffect, useState } from "react";
import Tabs from "./components/Tabs";
import "./styles.css";

// Context pour partager l'auth avec les composants enfants
export const AuthContext = React.createContext(null);

export default function App() {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    // Écouter les messages depuis le parent (frontend-shell)
    const handleMessage = (event) => {
      // Accepter les messages de n'importe quelle origine pour le moment (on vérifie le source dans le data)
      if (!event.data) return;
      
      // Vérifier que le message vient bien du parent shell
      if (event.data.source !== 'frontend-shell') return;

      // Gérer l'initialisation de l'auth
      if (event.data.type === 'AUTH_INIT' || event.data.type === 'AUTH_UPDATE') {
        if (event.data.auth && event.data.auth.isAuthenticated && event.data.auth.token) {
          console.log('Admin MFE: Received auth token', { hasToken: !!event.data.auth.token });
          setAuthData(event.data.auth);
          setIsDisconnected(false);
        } else {
          console.warn('Admin MFE: Received auth but no valid token', event.data.auth);
          setAuthData(null);
        }
      }
      
      // Gérer la déconnexion
      if (event.data.type === 'LOGOUT') {
        setIsDisconnected(true);
        setAuthData(null);
        // Nettoyer les cookies d'authentification
        try {
          document.cookie = 'portal_auth_state=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        } catch (error) {
          console.warn('Could not clear auth cookie:', error);
        }
      }
      
      // Gérer les erreurs 401 depuis le parent (si le parent détecte une erreur)
      if (event.data.type === 'AUTH_401_ERROR') {
        setIsDisconnected(true);
        setAuthData(null);
      }
    };

    window.addEventListener('message', handleMessage);

    // Demander l'auth au parent si on n'en a pas encore (avec retry)
    if (!authData && window.parent !== window) {
      // Envoyer la demande immédiatement
      window.parent.postMessage({ type: 'AUTH_REQUEST', source: 'admin-mfe' }, '*');
      
      // Retry après un court délai si on n'a toujours pas reçu l'auth
      const retryTimeout = setTimeout(() => {
        if (!authData) {
          console.log('Admin MFE: Retrying auth request');
          window.parent.postMessage({ type: 'AUTH_REQUEST', source: 'admin-mfe' }, '*');
        }
      }, 1000);
      
      return () => {
        clearTimeout(retryTimeout);
        window.removeEventListener('message', handleMessage);
      };
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [authData]);

  if (isDisconnected) {
    return (
      <div className="mfe-root flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Session expirée</h2>
          <p className="text-gray-600 mb-4">
            Vous avez été déconnecté. Veuillez vous reconnecter depuis le portail principal.
          </p>
        </div>
      </div>
    );
  }

  // Si pas encore d'auth, attendre
  if (!authData && !isDisconnected) {
    return (
      <div className="mfe-root flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">Chargement de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authData}>
      <div className="mfe-root">
        <Tabs />
      </div>
    </AuthContext.Provider>
  );
}


