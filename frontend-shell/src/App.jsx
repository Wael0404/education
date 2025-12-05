import React, { useEffect, useRef } from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { logout } from "./store";
import ProtectedRoute from "./components/ProtectedRoute";

// Component pour l'iframe admin avec gestion de l'auth
function AdminIframe({ auth, onLogout }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Fonction pour envoyer l'auth (utilisée pour les demandes et au chargement)
    const sendAuth = () => {
      try {
        iframe.contentWindow?.postMessage(
          {
            type: 'AUTH_INIT',
            source: 'frontend-shell',
            auth: {
              token: auth.token,
              user: auth.user,
              role: auth.role,
              isAuthenticated: auth.isAuthenticated
            }
          },
          '*'
        );
      } catch (error) {
        console.warn('Could not send auth to admin iframe:', error);
      }
    };

    // Attendre que l'iframe soit chargée
    const handleLoad = () => {
      // Ajouter un petit délai pour s'assurer que l'iframe est complètement prête
      setTimeout(() => {
        sendAuth();
      }, 100);
    };

    // Écouter les demandes d'auth et les erreurs 401 depuis l'iframe
    const handleMessage = (event) => {
      if (!event.data) return;
      
      // Répondre aux demandes d'auth
      if (event.data.type === 'AUTH_REQUEST' && event.data.source === 'admin-mfe') {
        sendAuth();
      }
      
      // Gérer les erreurs 401 - déconnecter automatiquement
      if (event.data.type === 'AUTH_401_ERROR' && event.data.source === 'admin-mfe') {
        onLogout();
      }
    };

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', handleLoad);
    
    // Si l'iframe est déjà chargée, envoyer immédiatement
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }
    
    // Envoyer aussi après un court délai au cas où l'iframe se charge rapidement
    const timeoutId = setTimeout(() => {
      if (iframe.contentDocument?.readyState === 'complete') {
        sendAuth();
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', handleLoad);
    };
  }, [auth]);

  // Envoyer les mises à jour d'auth quand elles changent
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      iframe.contentWindow?.postMessage(
        {
          type: 'AUTH_UPDATE',
          source: 'frontend-shell',
          auth: {
            token: auth.token,
            user: auth.user,
            role: auth.role,
            isAuthenticated: auth.isAuthenticated
          }
        },
        '*'
      );
    } catch (error) {
      console.warn('Could not send auth update to admin iframe:', error);
    }
  }, [auth.token, auth.user, auth.role, auth.isAuthenticated]);

  return (
    <div className="iframe-wrapper">
      <iframe
        ref={iframeRef}
        title="Admin Dashboard"
        src="http://localhost:3002"
        style={{ border: "none", width: "100%", height: "100%" }}
      />
    </div>
  );
}

// Component pour l'iframe étudiant avec gestion de l'auth
function StudentIframe({ auth, onLogout }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        iframe.contentWindow?.postMessage(
          {
            type: 'AUTH_INIT',
            source: 'frontend-shell',
            auth: {
              token: auth.token,
              user: auth.user,
              role: auth.role,
              isAuthenticated: auth.isAuthenticated
            }
          },
          '*'
        );
      } catch (error) {
        console.warn('Could not send auth to student iframe:', error);
      }
    };

    // Écouter les demandes d'auth et les erreurs 401 depuis l'iframe
    const handleMessage = (event) => {
      if (!event.data) return;
      
      // Répondre aux demandes d'auth
      if (event.data.type === 'AUTH_REQUEST' && event.data.source === 'student-mfe') {
        try {
          iframe.contentWindow?.postMessage(
            {
              type: 'AUTH_INIT',
              source: 'frontend-shell',
              auth: {
                token: auth.token,
                user: auth.user,
                role: auth.role,
                isAuthenticated: auth.isAuthenticated
              }
            },
            '*'
          );
        } catch (error) {
          console.warn('Could not send auth response to student iframe:', error);
        }
      }
      
      // Gérer les erreurs 401 - déconnecter automatiquement
      if (event.data.type === 'AUTH_401_ERROR' && event.data.source === 'student-mfe') {
        onLogout();
      }
    };

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', handleLoad);
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', handleLoad);
    };
  }, [auth]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      iframe.contentWindow?.postMessage(
        {
          type: 'AUTH_UPDATE',
          source: 'frontend-shell',
          auth: {
            token: auth.token,
            user: auth.user,
            role: auth.role,
            isAuthenticated: auth.isAuthenticated
          }
        },
        '*'
      );
    } catch (error) {
      console.warn('Could not send auth update to student iframe:', error);
    }
  }, [auth.token, auth.user, auth.role, auth.isAuthenticated]);

  return (
    <div className="iframe-wrapper">
      <iframe
        ref={iframeRef}
        title="Espace Étudiant"
        src="http://localhost:3003"
        style={{ border: "none", width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default function App() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Masquer le footer sur les routes avec iframes
  const hideFooter = location.pathname === "/admin" || location.pathname === "/etudiant";

  const handleLogout = () => {
    dispatch(logout());
    
    // Notifier tous les iframes (microfrontends) de la déconnexion
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        // Envoyer un message de déconnexion à chaque iframe
        iframe.contentWindow?.postMessage(
          { type: 'LOGOUT', source: 'frontend-shell' },
          '*'
        );
      } catch (error) {
        // Ignorer les erreurs de cross-origin si l'iframe n'est pas encore chargée
        console.warn('Could not send logout message to iframe:', error);
      }
    });
    
    // Rediriger vers la page de connexion
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">🎓</span>
          <span className="brand-text">Portail Éducatif</span>
        </div>
        <nav className="nav-links">
          {(() => {
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

            // on essaie d'abord Redux, puis on complète avec les cookies si besoin
            let userToShow = auth.user;
            let roleToShow = auth.role;
            try {
              if (!userToShow) {
                const raw = getCookie("portal_auth_state");
                if (raw) {
                  const parsed = JSON.parse(decodeURIComponent(raw));
                  if (parsed && typeof parsed === "object") {
                    userToShow = parsed.user || userToShow;
                    roleToShow = parsed.role || roleToShow;
                  }
                }
              }
            } catch {
              // ignore erreurs d'accès aux cookies
            }

            if (userToShow) {
              const roleText = roleToShow && (
                roleToShow.includes("ADMIN")
                  ? "Administrateur"
                  : roleToShow.includes("PROF")
                  ? "Prof"
                  : "Étudiant"
              );
              
              const roleColor = roleToShow && (
                roleToShow.includes("ADMIN")
                  ? "role-admin"
                  : roleToShow.includes("PROF")
                  ? "role-prof"
                  : "role-student"
              );
              
              return (
                <>
                  <div className="user-info">
                    <div className="user-avatar">
                      <span className="avatar-icon">👤</span>
                    </div>
                    <div className="user-details">
                      <span className="user-email" title={userToShow.email}>
                        {userToShow.email}
                      </span>
                      {roleToShow && (
                        <span className={`user-role-badge ${roleColor}`} title={`Rôle: ${roleText}`}>
                          {roleText}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-button logout-btn"
                    onClick={handleLogout}
                    title="Se déconnecter"
                    aria-label="Se déconnecter"
                  >
                    <span className="logout-text">Déconnexion</span>
                    <span className="logout-icon">🚪</span>
                  </button>
                </>
              );
            }

            return (
              <>
                <Link to="/login" className="nav-link">Connexion</Link>
                <Link to="/register" className="nav-link">Inscription</Link>
              </>
            );
          })()}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminIframe auth={auth} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/etudiant"
            element={
              <ProtectedRoute>
                <StudentIframe auth={auth} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {!hideFooter && (
        <footer className="app-footer">
          <span>Microfrontend rôles sur </span>
          <a href="http://localhost:3001" target="_blank" rel="noreferrer">
            http://localhost:3001
          </a>
        </footer>
      )}
    </div>
  );
}


