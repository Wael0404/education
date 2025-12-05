import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";

const API_BASE = "http://localhost:8000";

// Helper pour construire les headers avec Authorization si token présent
function buildAuthHeaders(extra = {}, authToken) {
  const headers = { ...extra };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

// Helper pour gérer les erreurs 401 et déconnecter automatiquement
function handle401Error() {
  // Notifier le parent shell qu'une erreur 401 s'est produite
  if (window.parent !== window) {
    window.parent.postMessage(
      { type: 'AUTH_401_ERROR', source: 'admin-mfe' },
      '*'
    );
  }
}

// Wrapper pour fetch qui détecte les erreurs 401
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, options);
  
  // Si on reçoit une erreur 401, déclencher la déconnexion
  if (response.status === 401) {
    handle401Error();
    throw new Error('Unauthorized - Session expired');
  }
  
  return response;
}

export default function Tabs() {
  const authData = useContext(AuthContext);
  const authToken = authData?.token || null;
  
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [nextId, setNextId] = useState(1);
  const [activeMatiere, setActiveMatiere] = useState({});
  const [nextMatiereId, setNextMatiereId] = useState({});
  const [activeChapitre, setActiveChapitre] = useState({});
  const [nextChapitreId, setNextChapitreId] = useState({});
  const [editingTab, setEditingTab] = useState(null);
  const [editingMatiere, setEditingMatiere] = useState(null);
  const [editingChapitre, setEditingChapitre] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [miniJeuTypeModal, setMiniJeuTypeModal] = useState(null); // { chapitreId: number }
  const [previewModal, setPreviewModal] = useState(null); // { chapitreId: number, gameType: string }
  const [miniJeuData, setMiniJeuData] = useState({}); // Données du mini jeu en cours de création
  // Mémorise la dernière valeur sauvegardée en DB pour chaque niveau
  const lastSavedLabelsRef = React.useRef({});

  // Types de mini jeux disponibles
  const miniJeuTypes = [
    { value: 'QCM_Multi', label: 'QCM Multi (Plusieurs réponses)', icon: '☑️' },
    { value: 'QCM_unique', label: 'QCM Unique (Une seule réponse)', icon: '☐' },
    { value: 'QCM_calcul', label: 'QCM Calcul', icon: '🔢' },
    { value: 'Texte_a_trou', label: 'Texte à trou', icon: '📝' },
    { value: 'Ordre', label: 'Ordre', icon: '🔢' },
    { value: 'Ordre_groupe', label: 'Ordre par groupe', icon: '📋' },
    { value: 'Associer', label: 'Associer', icon: '🔗' },
    { value: 'Question_ouverte', label: 'Question ouverte', icon: '💬' },
  ];

  // Charger les niveaux depuis le backend au chargement
  useEffect(() => {
    if (!authToken) {
      console.log('Admin MFE Tabs: No auth token yet, waiting...');
      return; // Attendre d'avoir le token
    }
    
    console.log('Admin MFE Tabs: Loading niveaux with token', { 
      hasToken: !!authToken, 
      tokenLength: authToken?.length,
      tokenPreview: authToken?.substring(0, 20) + '...'
    });
    
    const loadNiveaux = async () => {
      try {
        const headers = buildAuthHeaders({}, authToken);
        console.log('Admin MFE Tabs: Making request with headers', { 
          hasAuth: !!headers.Authorization,
          authHeader: headers.Authorization?.substring(0, 30) + '...'
        });
        
        const res = await fetchWithAuth(`${API_BASE}/api/niveaux`, {
          headers
        });
        if (!res.ok) return;
        const data = await res.json();
        const niveaux = data.map((n) => ({
          id: n.id,
          label: n.nom,
          title: n.nom,
          content: "",
          matieres: [], // On pourra les charger plus tard
        }));
        setTabs(niveaux);
        if (niveaux.length > 0) {
          setActiveTab(niveaux[0].id);
        }
        const maxId = niveaux.reduce((max, n) => Math.max(max, n.id), 0);
        setNextId(maxId + 1);
      } catch (e) {
        console.error("Erreur de chargement des niveaux", e);
      }
    };
    loadNiveaux();
  }, [authToken]);

  // Charger les matières du niveau actif
  useEffect(() => {
    const loadMatieres = async () => {
      if (!activeTab) return;
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/matieres?niveau_id=${encodeURIComponent(activeTab)}`,
          {
            headers: buildAuthHeaders({}, authToken),
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const matieres = data.map((m) => ({
          id: m.id,
          label: m.nom,
          content: m.description || "",
          chapitres: [],
        }));

        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === activeTab ? { ...tab, matieres } : tab
          )
        );

        if (matieres.length > 0 && !activeMatiere[activeTab]) {
          setActiveMatiere({ ...activeMatiere, [activeTab]: matieres[0].id });
        }
      } catch (e) {
        console.error("Erreur de chargement des matières", e);
      }
    };

    if (!authToken) return; // Attendre d'avoir le token
    
    loadMatieres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authToken]);

  // Charger les chapitres de la matière active
  useEffect(() => {
    const loadChapitres = async () => {
      if (!activeTab) return;
      const matiereId = activeMatiere[activeTab];
      if (!matiereId) return;

      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/chapitres?matiere_id=${encodeURIComponent(
            matiereId
          )}`,
          {
            headers: buildAuthHeaders({}, authToken),
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const chapitres = data.map((c) => ({
          id: c.id,
          label: c.titre,
          content: c.contenu || "",
          paragraphes: [],
          moduleValidations: [],
          miniJeux: [],
          exercices: [],
        }));

        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === activeTab
              ? {
                  ...tab,
                  matieres: (tab.matieres || []).map((m) =>
                    m.id === matiereId ? { ...m, chapitres } : m
                  ),
                }
              : tab
          )
        );

        const chapitreKey = `${activeTab}-${matiereId}`;
        if (chapitres.length > 0 && !activeChapitre[chapitreKey]) {
          setActiveChapitre({
            ...activeChapitre,
            [chapitreKey]: chapitres[0].id,
          });
        }
      } catch (e) {
        console.error("Erreur de chargement des chapitres", e);
      }
    };

    if (!authToken) return; // Attendre d'avoir le token
    
    loadChapitres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeMatiere[activeTab], authToken]);

  // Charger les détails complets du chapitre actif
  useEffect(() => {
    const loadChapitreDetails = async () => {
      if (!activeTab) return;
      const matiereId = activeMatiere[activeTab];
      if (!matiereId) return;
      const chapitreKey = `${activeTab}-${matiereId}`;
      const chapitreId = activeChapitre[chapitreKey];
      if (!chapitreId) return;

      try {
        const res = await fetchWithAuth(
          `${API_BASE}/api/chapitres/${chapitreId}`,
          {
            headers: buildAuthHeaders({}, authToken),
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        
        // Mettre à jour le chapitre avec toutes ses données
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.id === activeTab
              ? {
                  ...tab,
                  matieres: (tab.matieres || []).map((m) =>
                    m.id === matiereId
                      ? {
                          ...m,
                          chapitres: (m.chapitres || []).map((c) =>
                            c.id === chapitreId
                              ? {
                                  ...c,
                                  label: data.titre,
                                  content: data.contenu || "",
                                  paragraphes: data.paragraphes || [],
                                  moduleValidations: data.modules_validation || [],
                                  miniJeux: data.mini_jeux || [],
                                  exercices: data.exercices || [],
                                }
                              : c
                          ),
                        }
                      : m
                  ),
                }
              : tab
          )
        );
      } catch (e) {
        console.error("Erreur de chargement des détails du chapitre", e);
      }
    };

    if (!authToken) return;
    
    loadChapitreDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeMatiere[activeTab], activeChapitre, authToken]);

  const handleAddTab = async () => {
    const defaultLabel = `Niveau ${nextId}`;
    const body = {
      nom: defaultLabel,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/niveaux`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création du niveau");
        return;
      }
      const created = await res.json();
      const newTab = {
        id: created.id,
        label: created.nom,
        title: created.nom,
        content: "",
        matieres: [],
      };
      setTabs([...tabs, newTab]);
      setNextId(nextId + 1);
      setActiveTab(newTab.id);
    } catch (e) {
      console.error("Erreur réseau lors de la création du niveau", e);
    }
  };

  const handleTabClick = (tabId) => {
    console.log("Clicking on tab:", tabId, "Current active:", activeTab);
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      // Initialiser la matière active pour ce niveau si elle n'existe pas
      const tab = tabs.find(t => t.id === tabId);
      if (tab && tab.matieres && tab.matieres.length > 0 && !activeMatiere[tabId]) {
        const firstMatiere = tab.matieres[0];
        setActiveMatiere({ ...activeMatiere, [tabId]: firstMatiere.id });
        // Initialiser le chapitre actif pour la première matière
        if (firstMatiere.chapitres && firstMatiere.chapitres.length > 0) {
          setActiveChapitre({ ...activeChapitre, [`${tabId}-${firstMatiere.id}`]: firstMatiere.chapitres[0].id });
        }
      }
      console.log("Tab changed to:", tabId);
    }
  };

  const handleTabLabelChange = (tabId, newLabel) => {
    // Met à jour seulement le state local pendant la saisie
    setTabs(
      tabs.map((tab) =>
        tab.id === tabId ? { ...tab, label: newLabel, title: newLabel } : tab
      )
    );
  };

  // Sauvegarde en base quand l'utilisateur a fini d'éditer le nom
  const saveTabLabel = async (tabId) => {
    const currentTab = tabs.find((t) => t.id === tabId);
    if (!currentTab) return;

    const newLabel = (currentTab.label || "").trim();
    if (!newLabel) return;

    // Éviter les appels inutiles si rien n'a changé
    const lastSaved = lastSavedLabelsRef.current[tabId];
    if (lastSaved === newLabel) return;

    try {
      await fetchWithAuth(`${API_BASE}/api/niveaux/${tabId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          nom: newLabel,
        }),
      });

      // Met à jour la valeur sauvegardée
      lastSavedLabelsRef.current[tabId] = newLabel;
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour du niveau", e);
    }
  };

  const handleTabContentChange = (tabId, newContent) => {
    setTabs(
      tabs.map((tab) =>
        tab.id === tabId ? { ...tab, content: newContent } : tab
      )
    );
  };

  const handleTabTitleChange = (tabId, newTitle) => {
    setTabs(
      tabs.map((tab) =>
        tab.id === tabId ? { ...tab, title: newTitle } : tab
      )
    );
  };

  const handleDeleteTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setConfirmModal({
        type: 'error',
        title: 'Suppression impossible',
        message: 'Vous devez avoir au moins un niveau.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    
    const tabToDelete = tabs.find(tab => tab.id === tabId);
    const tabName = tabToDelete ? tabToDelete.label : "ce niveau";
    
    // Afficher une popup de confirmation
    setConfirmModal({
      type: 'delete',
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer "${tabName}" ?`,
      warning: 'Cette action supprimera également toutes les matières et chapitres associés.',
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`${API_BASE}/api/niveaux/${tabId}`, {
            method: 'DELETE',
            headers: buildAuthHeaders({}, authToken),
          });
          if (!res.ok) {
            console.error('Erreur lors de la suppression du niveau');
            setConfirmModal(null);
            return;
          }
          
          const newTabs = tabs.filter((tab) => tab.id !== tabId);
          setTabs(newTabs);
          if (activeTab === tabId) {
            setActiveTab(newTabs[0].id);
          }
          // Nettoyer les états des matières pour ce niveau
          const newActiveMatiere = { ...activeMatiere };
          delete newActiveMatiere[tabId];
          setActiveMatiere(newActiveMatiere);
          const newNextMatiereId = { ...nextMatiereId };
          delete newNextMatiereId[tabId];
          setNextMatiereId(newNextMatiereId);
        } catch (e) {
          console.error('Erreur réseau lors de la suppression du niveau', e);
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Fonctions pour gérer les matières
  const handleAddMatiere = async (niveauId) => {
    const tab = tabs.find((t) => t.id === niveauId);
    if (!tab) return;

    const currentNextId =
      nextMatiereId[niveauId] ||
      (tab.matieres.length > 0
        ? Math.max(...tab.matieres.map((m) => m.id)) + 1
        : 1);

    const defaultLabel = `Matière ${currentNextId}`;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/matieres`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          nom: defaultLabel,
          description: "",
          niveau_id: niveauId,
        }),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création de la matière");
        return;
      }
      const created = await res.json();

      const newMatiere = {
        id: created.id,
        label: created.nom,
        content: created.description || "",
        chapitres: [],
      };

      setTabs(
        tabs.map((tab) =>
          tab.id === niveauId
            ? { ...tab, matieres: [...(tab.matieres || []), newMatiere] }
            : tab
        )
      );
      setNextMatiereId({ ...nextMatiereId, [niveauId]: currentNextId + 1 });
      setActiveMatiere({ ...activeMatiere, [niveauId]: newMatiere.id });
    } catch (e) {
      console.error("Erreur réseau lors de la création de la matière", e);
    }
  };

  const handleMatiereClick = (niveauId, matiereId) => {
    setActiveMatiere({ ...activeMatiere, [niveauId]: matiereId });
    // Initialiser le chapitre actif pour cette matière si nécessaire
    const tab = tabs.find(t => t.id === niveauId);
    if (tab) {
      const matiere = tab.matieres.find(m => m.id === matiereId);
      if (matiere && matiere.chapitres && matiere.chapitres.length > 0) {
        const chapitreKey = `${niveauId}-${matiereId}`;
        if (!activeChapitre[chapitreKey]) {
          setActiveChapitre({ ...activeChapitre, [chapitreKey]: matiere.chapitres[0].id });
        }
      }
    }
  };

  const handleMatiereLabelChange = (niveauId, matiereId, newLabel) => {
    // Mise à jour locale pendant la saisie
    setTabs(
      tabs.map((tab) =>
        tab.id === niveauId
          ? {
              ...tab,
              matieres: tab.matieres.map((m) =>
                m.id === matiereId ? { ...m, label: newLabel } : m
              ),
            }
          : tab
      )
    );
  };

  // Sauvegarde du nom de matière en base quand l'édition est terminée
  const saveMatiereLabel = async (niveauId, matiereId) => {
    const tab = tabs.find((t) => t.id === niveauId);
    if (!tab || !tab.matieres) return;
    const matiere = tab.matieres.find((m) => m.id === matiereId);
    if (!matiere) return;

    const newLabel = (matiere.label || "").trim();
    if (!newLabel) return;

    try {
      await fetchWithAuth(`${API_BASE}/api/matieres/${matiereId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          nom: newLabel,
          description: matiere.content || "",
        }),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour de la matière", e);
    }
  };

  const handleMatiereContentChange = (niveauId, matiereId, newContent) => {
    setTabs(
      tabs.map((tab) =>
        tab.id === niveauId
          ? {
              ...tab,
              matieres: tab.matieres.map((m) =>
                m.id === matiereId ? { ...m, content: newContent } : m
              )
            }
          : tab
      )
    );
  };

  const handleDeleteMatiere = (niveauId, matiereId, e) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === niveauId);
    if (!tab || tab.matieres.length <= 1) {
      setConfirmModal({
        type: 'error',
        title: 'Suppression impossible',
        message: 'Vous devez avoir au moins une matière.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    
    const matiereToDelete = tab.matieres.find(m => m.id === matiereId);
    const matiereName = matiereToDelete ? matiereToDelete.label : "cette matière";
    
    // Afficher une popup de confirmation
    setConfirmModal({
      type: 'delete',
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer "${matiereName}" ?`,
      warning: 'Cette action supprimera également tous les chapitres associés.',
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`${API_BASE}/api/matieres/${matiereId}`, {
            method: 'DELETE',
            headers: buildAuthHeaders({}, authToken),
          });
          if (!res.ok) {
            console.error('Erreur lors de la suppression de la matière');
            setConfirmModal(null);
            return;
          }
          
          const newMatieres = tab.matieres.filter((m) => m.id !== matiereId);
          setTabs(
            tabs.map((tab) =>
              tab.id === niveauId ? { ...tab, matieres: newMatieres } : tab
            )
          );
          
          if (activeMatiere[niveauId] === matiereId) {
            setActiveMatiere({ ...activeMatiere, [niveauId]: newMatieres[0].id });
          }
          
          // Nettoyer les états des chapitres pour cette matière
          const chapitreKey = `${niveauId}-${matiereId}`;
          const newActiveChapitre = { ...activeChapitre };
          delete newActiveChapitre[chapitreKey];
          setActiveChapitre(newActiveChapitre);
          const newNextChapitreId = { ...nextChapitreId };
          delete newNextChapitreId[chapitreKey];
          setNextChapitreId(newNextChapitreId);
        } catch (e) {
          console.error('Erreur réseau lors de la suppression de la matière', e);
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Fonctions pour gérer les chapitres
  const handleAddChapitre = async (niveauId, matiereId) => {
    const tab = tabs.find(t => t.id === niveauId);
    if (!tab) return;
    const matiere = tab.matieres.find(m => m.id === matiereId);
    if (!matiere) return;
    
    const chapitreKey = `${niveauId}-${matiereId}`;
    const currentNextId =
      nextChapitreId[chapitreKey] ||
      (matiere.chapitres && matiere.chapitres.length > 0
        ? Math.max(...matiere.chapitres.map((c) => c.id)) + 1
        : 1);

    const defaultLabel = `Chapitre ${currentNextId}`;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/chapitres`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          titre: defaultLabel,
          contenu: "Contenu du chapitre",
          ordre: currentNextId,
          matiere_id: matiereId,
        }),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création du chapitre");
        return;
      }
      const created = await res.json();

      const newChapitre = {
        id: created.id,
        label: created.titre,
        content: created.contenu || "",
      };

      setTabs(
        tabs.map((tab) =>
          tab.id === niveauId
            ? {
                ...tab,
                matieres: tab.matieres.map((m) =>
                  m.id === matiereId
                    ? {
                        ...m,
                        chapitres: [...(m.chapitres || []), newChapitre],
                      }
                    : m
                ),
              }
            : tab
        )
      );
      setNextChapitreId({
        ...nextChapitreId,
        [chapitreKey]: currentNextId + 1,
      });
      setActiveChapitre({
        ...activeChapitre,
        [chapitreKey]: newChapitre.id,
      });
    } catch (e) {
      console.error("Erreur réseau lors de la création du chapitre", e);
    }
  };

  // Sauvegarde du titre (et éventuellement du contenu) du chapitre en base lorsque l'édition est terminée
  const saveChapitreLabel = async (niveauId, matiereId, chapitreId) => {
    const tab = tabs.find((t) => t.id === niveauId);
    if (!tab || !tab.matieres) return;
    const matiere = tab.matieres.find((m) => m.id === matiereId);
    if (!matiere || !matiere.chapitres) return;
    const chapitre = matiere.chapitres.find((c) => c.id === chapitreId);
    if (!chapitre) return;

    const newLabel = (chapitre.label || "").trim();
    if (!newLabel) return;

    try {
      await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          titre: newLabel,
          contenu: chapitre.content || "",
        }),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour du chapitre", e);
    }
  };

  const handleChapitreClick = (niveauId, matiereId, chapitreId) => {
    const chapitreKey = `${niveauId}-${matiereId}`;
    setActiveChapitre({ ...activeChapitre, [chapitreKey]: chapitreId });
  };

  const handleChapitreLabelChange = (niveauId, matiereId, chapitreId, newLabel) => {
    setTabs(
      tabs.map((tab) =>
        tab.id === niveauId
          ? {
              ...tab,
              matieres: tab.matieres.map((m) =>
                m.id === matiereId
                  ? {
                      ...m,
                      chapitres: m.chapitres.map((c) =>
                        c.id === chapitreId ? { ...c, label: newLabel } : c
                      )
                    }
                  : m
              )
            }
          : tab
      )
    );
  };

  const handleChapitreContentChange = (niveauId, matiereId, chapitreId, newContent) => {
    setTabs(
      tabs.map((tab) =>
        tab.id === niveauId
          ? {
              ...tab,
              matieres: tab.matieres.map((m) =>
                m.id === matiereId
                  ? {
                      ...m,
                      chapitres: m.chapitres.map((c) =>
                        c.id === chapitreId ? { ...c, content: newContent } : c
                      )
                    }
                  : m
              )
            }
          : tab
      )
    );
  };

  const saveChapitreContent = async (niveauId, matiereId, chapitreId) => {
    const tab = tabs.find((t) => t.id === niveauId);
    if (!tab || !tab.matieres) return;
    const matiere = tab.matieres.find((m) => m.id === matiereId);
    if (!matiere || !matiere.chapitres) return;
    const chapitre = matiere.chapitres.find((c) => c.id === chapitreId);
    if (!chapitre) return;

    try {
      await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          titre: chapitre.label || "",
          contenu: chapitre.content || "",
        }),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour du contenu du chapitre", e);
    }
  };

  const handleDeleteChapitre = (niveauId, matiereId, chapitreId, e) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === niveauId);
    if (!tab) return;
    const matiere = tab.matieres.find(m => m.id === matiereId);
    if (!matiere || !matiere.chapitres || matiere.chapitres.length <= 1) {
      setConfirmModal({
        type: 'error',
        title: 'Suppression impossible',
        message: 'Vous devez avoir au moins un chapitre.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    
    const chapitreToDelete = matiere.chapitres.find(c => c.id === chapitreId);
    const chapitreName = chapitreToDelete ? chapitreToDelete.label : "ce chapitre";
    
    // Afficher une popup de confirmation
    setConfirmModal({
      type: 'delete',
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer "${chapitreName}" ?`,
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
            method: 'DELETE',
            headers: buildAuthHeaders({}, authToken),
          });
          if (!res.ok) {
            console.error('Erreur lors de la suppression du chapitre');
            setConfirmModal(null);
            return;
          }
          
          const newChapitres = matiere.chapitres.filter((c) => c.id !== chapitreId);
          setTabs(
            tabs.map((tab) =>
              tab.id === niveauId
                ? {
                    ...tab,
                    matieres: tab.matieres.map((m) =>
                      m.id === matiereId ? { ...m, chapitres: newChapitres } : m
                    )
                  }
                : tab
            )
          );
          
          const chapitreKey = `${niveauId}-${matiereId}`;
          if (activeChapitre[chapitreKey] === chapitreId) {
            setActiveChapitre({ ...activeChapitre, [chapitreKey]: newChapitres[0].id });
          }
        } catch (e) {
          console.error('Erreur réseau lors de la suppression du chapitre', e);
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Handlers pour Paragraphes
  const handleAddParagraphe = async (chapitreId) => {
    if (!chapitreId) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/paragraphes`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          contenu: "Nouveau paragraphe",
          chapitre_id: chapitreId,
        }),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création du paragraphe");
        return;
      }
      const created = await res.json();
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la création du paragraphe", e);
    }
  };

  const handleUpdateParagraphe = async (paragrapheId, newContenu) => {
    try {
      await fetchWithAuth(`${API_BASE}/api/paragraphes/${paragrapheId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({ contenu: newContenu }),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour du paragraphe", e);
    }
  };

  const handleDeleteParagraphe = async (paragrapheId, chapitreId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/paragraphes/${paragrapheId}`, {
        method: "DELETE",
        headers: buildAuthHeaders({}, authToken),
      });
      if (!res.ok) return;
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la suppression du paragraphe", e);
    }
  };

  // Handlers pour Module Validation
  const handleAddModuleValidation = async (chapitreId) => {
    if (!chapitreId) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/module-validations`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          contenu: "Nouveau module de validation",
          chapitre_id: chapitreId,
        }),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création du module de validation");
        return;
      }
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la création du module de validation", e);
    }
  };

  const handleUpdateModuleValidation = async (moduleId, newContenu) => {
    try {
      await fetchWithAuth(`${API_BASE}/api/module-validations/${moduleId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({ contenu: newContenu }),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour du module de validation", e);
    }
  };

  const handleDeleteModuleValidation = async (moduleId, chapitreId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/module-validations/${moduleId}`, {
        method: "DELETE",
        headers: buildAuthHeaders({}, authToken),
      });
      if (!res.ok) return;
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la suppression du module de validation", e);
    }
  };

  // Handlers pour Mini Jeux
  const handleSelectMiniJeuType = (chapitreId, gameType) => {
    // Fermer le modal de sélection et ouvrir la prévisualisation
    setMiniJeuTypeModal(null);
    // Initialiser les données par défaut selon le type
    const defaultData = {
      question: "",
      type: gameType,
      reponses: [], // Liste unique de réponses avec {text: "", isGood: false}
      reponse: "", // Pour QCM_unique uniquement
      formule: "",
      texte: "",
      distracteur: [],
      consigne: "",
      liste: [],
    };
    setMiniJeuData(defaultData);
    setPreviewModal({ chapitreId, gameType });
  };

  const handleAddMiniJeu = async (chapitreId, gameType) => {
    if (!chapitreId || !gameType) return;
    
    // Validation : la question est obligatoire
    if (!miniJeuData.question || miniJeuData.question.trim() === "") {
      alert("Veuillez saisir une question");
      return;
    }
    
    try {
      const payload = {
        type: gameType,
        question: miniJeuData.question,
        chapitre_id: chapitreId,
      };
      
      // Ajouter les données spécifiques selon le type
      if (gameType === 'QCM_Multi' || gameType === 'QCM_unique') {
        // Convertir la liste de réponses avec checkboxes en bonnes/mauvaises réponses
        if (Array.isArray(miniJeuData.reponses) && miniJeuData.reponses.length > 0) {
          const bonnes = miniJeuData.reponses
            .filter(r => r && r.text && r.text.trim() && r.isGood)
            .map(r => r.text.trim());
          const mauvaises = miniJeuData.reponses
            .filter(r => r && r.text && r.text.trim() && !r.isGood)
            .map(r => r.text.trim());
          
          if (bonnes.length > 0) {
            payload.bonnes_reponses = bonnes.join(';');
          }
          if (mauvaises.length > 0) {
            payload.mauvaises_reponses = mauvaises.join(';');
          }
        } else {
          // Fallback pour compatibilité avec l'ancien format
          if (Array.isArray(miniJeuData.bonnesReponses) && miniJeuData.bonnesReponses.length > 0) {
            payload.bonnes_reponses = miniJeuData.bonnesReponses.filter(r => r && r.trim()).join(';');
          } else if (typeof miniJeuData.bonnesReponses === 'string' && miniJeuData.bonnesReponses) {
            payload.bonnes_reponses = miniJeuData.bonnesReponses;
          }
          if (Array.isArray(miniJeuData.mauvaisesReponses) && miniJeuData.mauvaisesReponses.length > 0) {
            payload.mauvaises_reponses = miniJeuData.mauvaisesReponses.filter(r => r && r.trim()).join(';');
          } else if (typeof miniJeuData.mauvaisesReponses === 'string' && miniJeuData.mauvaisesReponses) {
            payload.mauvaises_reponses = miniJeuData.mauvaisesReponses;
          }
        }
        if (gameType === 'QCM_unique' && miniJeuData.reponse) payload.reponse = miniJeuData.reponse;
      } else if (gameType === 'QCM_calcul') {
        if (miniJeuData.formule) payload.formule = miniJeuData.formule;
        if (miniJeuData.fausseReponse) payload.fausse_reponse = miniJeuData.fausseReponse;
      } else if (gameType === 'Texte_a_trou') {
        if (miniJeuData.texte) payload.texte = miniJeuData.texte;
        if (miniJeuData.distracteur) payload.distracteur = miniJeuData.distracteur;
      } else if (gameType === 'Ordre' || gameType === 'Ordre_groupe') {
        if (miniJeuData.consigne) payload.consigne = miniJeuData.consigne;
        if (miniJeuData.liste) payload.liste = miniJeuData.liste;
      } else if (gameType === 'Question_ouverte') {
        if (miniJeuData.reponses) payload.reponses = miniJeuData.reponses;
      }
      
      const res = await fetchWithAuth(`${API_BASE}/api/mini-jeux`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création du mini jeu");
        return;
      }
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
      
      // Fermer le modal de prévisualisation et réinitialiser les données
      setPreviewModal(null);
      setMiniJeuData({});
    } catch (e) {
      console.error("Erreur réseau lors de la création du mini jeu", e);
    }
  };

  // Fonction pour rendre la prévisualisation selon le type (éditable)
  const renderPreview = (gameType) => {
    const updateData = (field, value) => {
      setMiniJeuData(prev => ({ ...prev, [field]: value }));
    };
    
    switch (gameType) {
      case 'QCM_Multi':
        // S'assurer que reponses est un tableau d'objets {text, isGood}
        const reponsesArrayMulti = Array.isArray(miniJeuData.reponses) 
          ? miniJeuData.reponses 
          : [];
        
        const addReponseMulti = () => {
          setMiniJeuData(prev => ({
            ...prev,
            reponses: [...(Array.isArray(prev.reponses) ? prev.reponses : []), { text: "", isGood: false }]
          }));
        };
        
        const removeReponseMulti = (index) => {
          setMiniJeuData(prev => ({
            ...prev,
            reponses: (Array.isArray(prev.reponses) ? prev.reponses : []).filter((_, i) => i !== index)
          }));
        };
        
        const updateReponseMulti = (index, value) => {
          setMiniJeuData(prev => {
            const arr = Array.isArray(prev.reponses) ? [...prev.reponses] : [];
            arr[index] = { ...arr[index], text: value };
            return { ...prev, reponses: arr };
          });
        };
        
        const toggleReponseMulti = (index) => {
          setMiniJeuData(prev => {
            const arr = Array.isArray(prev.reponses) ? [...prev.reponses] : [];
            arr[index] = { ...arr[index], isGood: !arr[index].isGood };
            return { ...prev, reponses: arr };
          });
        };
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Réponses (cochez les bonnes) :</label>
                  <button
                    type="button"
                    onClick={addReponseMulti}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    + Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {reponsesArrayMulti.map((reponse, index) => (
                    <div key={`reponse-${index}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reponse.isGood || false}
                        onChange={() => toggleReponseMulti(index)}
                        className="w-4 h-4 text-blue-600"
                        title="Cocher si c'est une bonne réponse"
                      />
                      <input
                        type="text"
                        value={reponse.text || ""}
                        onChange={(e) => updateReponseMulti(index, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded bg-white text-black"
                        style={{ color: '#000000' }}
                        placeholder={`Réponse ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeReponseMulti(index)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {reponsesArrayMulti.length === 0 && (
                    <p className="text-xs text-gray-500 italic">Aucune réponse. Cliquez sur "+ Ajouter" pour en ajouter.</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Aperçu :</p>
                {reponsesArrayMulti.filter(r => r && r.text && r.text.trim()).map((r, i) => (
                  <label key={`preview-${i}`} className={`flex items-center gap-2 p-2 rounded border ${r.isGood ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'}`}>
                    <input type="checkbox" className="w-4 h-4 text-blue-600" checked={r.isGood || false} disabled />
                    <span>{r.text.trim()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'QCM_unique':
        // S'assurer que reponses est un tableau d'objets {text, isGood}
        const reponsesArrayUnique = Array.isArray(miniJeuData.reponses) 
          ? miniJeuData.reponses 
          : [];
        
        const addReponseUnique = () => {
          setMiniJeuData(prev => ({
            ...prev,
            reponses: [...(Array.isArray(prev.reponses) ? prev.reponses : []), { text: "", isGood: false }]
          }));
        };
        
        const removeReponseUnique = (index) => {
          setMiniJeuData(prev => ({
            ...prev,
            reponses: (Array.isArray(prev.reponses) ? prev.reponses : []).filter((_, i) => i !== index)
          }));
        };
        
        const updateReponseUnique = (index, value) => {
          setMiniJeuData(prev => {
            const arr = Array.isArray(prev.reponses) ? [...prev.reponses] : [];
            arr[index] = { ...arr[index], text: value };
            return { ...prev, reponses: arr };
          });
        };
        
        const toggleReponseUnique = (index) => {
          setMiniJeuData(prev => {
            const arr = Array.isArray(prev.reponses) ? [...prev.reponses] : [];
            // Pour QCM_unique, une seule réponse peut être bonne
            // Si on coche une réponse, décocher toutes les autres
            arr.forEach((r, i) => {
              if (i === index) {
                arr[i] = { ...r, isGood: !r.isGood };
              } else {
                arr[i] = { ...r, isGood: false };
              }
            });
            return { ...prev, reponses: arr };
          });
        };
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Réponses (cochez la bonne) :</label>
                  <button
                    type="button"
                    onClick={addReponseUnique}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    + Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {reponsesArrayUnique.map((reponse, index) => (
                    <div key={`reponse-unique-${index}`} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="qcm_unique_reponse"
                        checked={reponse.isGood || false}
                        onChange={() => toggleReponseUnique(index)}
                        className="w-4 h-4 text-blue-600"
                        title="Cocher si c'est la bonne réponse"
                      />
                      <input
                        type="text"
                        value={reponse.text || ""}
                        onChange={(e) => updateReponseUnique(index, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded bg-white text-black"
                        style={{ color: '#000000' }}
                        placeholder={`Réponse ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeReponseUnique(index)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {reponsesArrayUnique.length === 0 && (
                    <p className="text-xs text-gray-500 italic">Aucune réponse. Cliquez sur "+ Ajouter" pour en ajouter.</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Aperçu :</p>
                {reponsesArrayUnique.filter(r => r && r.text && r.text.trim()).map((r, i) => (
                  <label key={`preview-unique-${i}`} className={`flex items-center gap-2 p-2 rounded border ${r.isGood ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'}`}>
                    <input type="radio" name="qcm_unique_preview" className="w-4 h-4 text-blue-600" checked={r.isGood || false} disabled />
                    <span>{r.text.trim()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'QCM_calcul':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question de calcul..."
                rows="2"
              />
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Formule :</label>
                <input
                  type="text"
                  value={miniJeuData.formule || ""}
                  onChange={(e) => updateData('formule', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Ex: 2 + 2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fausse réponse :</label>
                <input
                  type="text"
                  value={miniJeuData.fausseReponse || ""}
                  onChange={(e) => updateData('fausseReponse', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Ex: 3"
                />
              </div>
            </div>
          </div>
        );
      
      case 'Texte_a_trou':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Texte avec trous :</label>
                <textarea
                  value={miniJeuData.texte || ""}
                  onChange={(e) => updateData('texte', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Le [mot] est un animal."
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Distracteurs (séparés par ;) :</label>
                <textarea
                  value={miniJeuData.distracteur || ""}
                  onChange={(e) => updateData('distracteur', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="chien; oiseau; poisson"
                  rows="2"
                />
              </div>
            </div>
          </div>
        );
      
      case 'Ordre':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Consigne :</label>
                <textarea
                  value={miniJeuData.consigne || ""}
                  onChange={(e) => updateData('consigne', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Remettez les éléments dans le bon ordre"
                  rows="2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Liste d'éléments (séparés par ;) :</label>
                <textarea
                  value={miniJeuData.liste || ""}
                  onChange={(e) => updateData('liste', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Élément 1; Élément 2; Élément 3"
                  rows="3"
                />
              </div>
            </div>
          </div>
        );
      
      case 'Ordre_groupe':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Consigne :</label>
                <textarea
                  value={miniJeuData.consigne || ""}
                  onChange={(e) => updateData('consigne', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Organisez les éléments par groupes"
                  rows="2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Liste par groupe (JSON) :</label>
                <textarea
                  value={miniJeuData.liste || ""}
                  onChange={(e) => updateData('liste', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black font-mono text-sm"
                  style={{ color: '#000000' }}
                  placeholder='{"groupe1": ["élément1", "élément2"], "groupe2": ["élément3", "élément4"]}'
                  rows="4"
                />
              </div>
            </div>
          </div>
        );
      
      case 'Associer':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Propositions (JSON) :</label>
                <textarea
                  value={miniJeuData.propositions || ""}
                  onChange={(e) => updateData('propositions', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black font-mono text-sm"
                  style={{ color: '#000000' }}
                  placeholder='[{"colonne1": "A", "colonne2": "1"}, {"colonne1": "B", "colonne2": "2"}]'
                  rows="4"
                />
              </div>
            </div>
          </div>
        );
      
      case 'Question_ouverte':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label className="block font-bold text-blue-900 mb-2">Question :</label>
              <textarea
                value={miniJeuData.question || ""}
                onChange={(e) => updateData('question', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black mb-4"
                style={{ color: '#000000' }}
                placeholder="Saisissez votre question..."
                rows="2"
              />
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Réponses acceptées (séparées par ;) :</label>
                <textarea
                  value={miniJeuData.reponses || ""}
                  onChange={(e) => updateData('reponses', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-black"
                  style={{ color: '#000000' }}
                  placeholder="Réponse 1; Réponse 2; Réponse 3"
                  rows="3"
                />
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Aperçu :</p>
                <textarea 
                  className="w-full p-3 border border-gray-300 rounded bg-white"
                  placeholder="Tapez votre réponse ici..."
                  rows="4"
                  disabled
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center text-gray-500 p-8">
            Aperçu non disponible pour ce type de jeu
          </div>
        );
    }
  };

  const handleUpdateMiniJeu = async (miniJeuId, updates) => {
    try {
      await fetchWithAuth(`${API_BASE}/api/mini-jeux/${miniJeuId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour du mini jeu", e);
    }
  };

  const handleDeleteMiniJeu = async (miniJeuId, chapitreId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/mini-jeux/${miniJeuId}`, {
        method: "DELETE",
        headers: buildAuthHeaders({}, authToken),
      });
      if (!res.ok) return;
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la suppression du mini jeu", e);
    }
  };

  // Handlers pour Exercices
  const handleAddExercice = async (chapitreId) => {
    if (!chapitreId) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/exercices`, {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({
          contenu: "Nouvel exercice",
          chapitre_id: chapitreId,
        }),
      });
      if (!res.ok) {
        console.error("Erreur lors de la création de l'exercice");
        return;
      }
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la création de l'exercice", e);
    }
  };

  const handleUpdateExercice = async (exerciceId, newContenu) => {
    try {
      await fetchWithAuth(`${API_BASE}/api/exercices/${exerciceId}`, {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }, authToken),
        body: JSON.stringify({ contenu: newContenu }),
      });
    } catch (e) {
      console.error("Erreur réseau lors de la mise à jour de l'exercice", e);
    }
  };

  const handleDeleteExercice = async (exerciceId, chapitreId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/exercices/${exerciceId}`, {
        method: "DELETE",
        headers: buildAuthHeaders({}, authToken),
      });
      if (!res.ok) return;
      
      // Recharger les détails du chapitre
      const chapitreRes = await fetchWithAuth(`${API_BASE}/api/chapitres/${chapitreId}`, {
        headers: buildAuthHeaders({}, authToken),
      });
      if (chapitreRes.ok) {
        const chapitreData = await chapitreRes.json();
        updateChapitreInState(chapitreId, chapitreData);
      }
    } catch (e) {
      console.error("Erreur réseau lors de la suppression de l'exercice", e);
    }
  };

  // Helper pour mettre à jour le chapitre dans le state
  const updateChapitreInState = (chapitreId, chapitreData) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTab
          ? {
              ...tab,
              matieres: (tab.matieres || []).map((m) =>
                m.id === activeMatiereId
                  ? {
                      ...m,
                      chapitres: (m.chapitres || []).map((c) =>
                        c.id === chapitreId
                          ? {
                              ...c,
                              label: chapitreData.titre,
                              content: chapitreData.contenu || "",
                              paragraphes: chapitreData.paragraphes || [],
                              moduleValidations: chapitreData.modules_validation || [],
                              miniJeux: chapitreData.mini_jeux || [],
                              exercices: chapitreData.exercices || [],
                            }
                          : c
                      ),
                    }
                  : m
              ),
            }
          : tab
      )
    );
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);
  const activeMatiereId = activeTabData ? (activeMatiere[activeTab] || (activeTabData.matieres && activeTabData.matieres.length > 0 ? activeTabData.matieres[0].id : null)) : null;
  const activeMatiereData = activeTabData && activeTabData.matieres 
    ? activeTabData.matieres.find((m) => m.id === activeMatiereId)
    : null;
  const chapitreKey = activeTabData && activeMatiereId ? `${activeTab}-${activeMatiereId}` : null;
  const activeChapitreId = activeMatiereData && chapitreKey ? (activeChapitre[chapitreKey] || (activeMatiereData.chapitres && activeMatiereData.chapitres.length > 0 ? activeMatiereData.chapitres[0].id : null)) : null;
  const activeChapitreData = activeMatiereData && activeMatiereData.chapitres 
    ? activeMatiereData.chapitres.find((c) => c.id === activeChapitreId)
    : null;
  
  // Initialiser la matière active si nécessaire
  React.useEffect(() => {
    if (activeTabData && activeTabData.matieres && activeTabData.matieres.length > 0) {
      if (!activeMatiere[activeTab]) {
        const firstMatiere = activeTabData.matieres[0];
        setActiveMatiere({ ...activeMatiere, [activeTab]: firstMatiere.id });
        // Initialiser le chapitre actif pour la première matière
        if (firstMatiere.chapitres && firstMatiere.chapitres.length > 0) {
          setActiveChapitre({ ...activeChapitre, [`${activeTab}-${firstMatiere.id}`]: firstMatiere.chapitres[0].id });
        }
      }
    }
  }, [activeTab, activeTabData]);
  
  console.log("Active tab:", activeTab, "Active matiere:", activeMatiereId);

  return (
    <div className="w-full min-h-full flex flex-col bg-white overflow-y-auto">
      {/* Section Header avec label */}
      <div className="bg-blue-50 border-b-2 border-blue-200 px-3 sm:px-4 py-2 sm:py-2.5">
        <h2 className="text-xs sm:text-sm font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-2">
          <span className="text-base">📚</span>
          <span>Niveaux</span>
        </h2>
      </div>
      
      {/* Tabs Header - Liste verticale sur mobile, ligne horizontale sur desktop, adapté à la fenêtre */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end bg-gray-50 border-b-2 border-gray-200 gap-1 sm:gap-1 px-2 sm:px-1 py-2 sm:py-1 overflow-y-auto sm:overflow-y-visible sm:overflow-x-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`relative cursor-pointer transition-all duration-300 ease-in-out flex items-center justify-between gap-2 sm:gap-1.5 flex-1 sm:flex-[0.8] sm:max-w-[220px] min-w-0 group ${
              activeTab === tab.id
                ? "bg-blue-200 border-l-4 sm:border-l-0 sm:border-b-4 border-blue-600 shadow-lg sm:shadow-[0_-4px_8px_rgba(59,130,246,0.4)] z-10 rounded-lg sm:rounded-t-md sm:mb-[-2px] transform scale-[1.02]"
                : "bg-white hover:bg-blue-50 active:bg-blue-100 shadow-sm sm:shadow-[0_-1px_3px_rgba(0,0,0,0.08)] rounded-lg sm:rounded-t-md sm:mb-[-2px] hover:scale-[1.01]"
            }`}
            style={{
              paddingTop: '0.875rem',
              paddingBottom: '0.875rem',
              paddingLeft: '0.875rem',
              paddingRight: '0.875rem',
              minHeight: '48px',
            }}
            onClick={() => {
              console.log("Tab clicked:", tab.id);
              handleTabClick(tab.id);
            }}
          >
            <input
              type="text"
              value={tab.label}
              onChange={(e) => handleTabLabelChange(tab.id, e.target.value)}
              onClick={(e) => {
                // Empêche le clic sur l'input de déclencher d'autres handlers
                e.stopPropagation();
                // Si on n'est pas en mode édition, empêche le focus et active juste l'onglet
                if (editingTab !== tab.id) {
                  e.preventDefault();
                  e.target.blur();
                  handleTabClick(tab.id);
                }
              }}
              onDoubleClick={(e) => {
                // Double-clic pour sélectionner le texte et permettre l'édition
                e.stopPropagation();
                e.preventDefault();
                handleTabClick(tab.id);
                setEditingTab(tab.id);
                // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
                requestAnimationFrame(() => {
                  e.target.focus();
                  e.target.select();
                });
              }}
              onBlur={() => {
                // Ne sauvegarde que si on était vraiment en mode édition
                const id = tab.id;
                if (editingTab === tab.id) {
                  setEditingTab(null);
                  // Sauvegarde une seule fois quand l'utilisateur a fini d'éditer
                  saveTabLabel(id);
                }
              }}
              onKeyDown={(e) => {
                // Appuyer sur Enter ou Escape pour terminer l'édition
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.target.blur();
                }
              }}
              onFocus={(e) => {
                // Si on n'est pas en mode édition, empêche le focus
                if (editingTab !== tab.id) {
                  e.target.blur();
                }
              }}
              readOnly={editingTab !== tab.id}
              tabIndex={editingTab === tab.id ? 0 : -1}
              className={`flex-1 border-none bg-transparent p-0 m-0 outline-none cursor-pointer min-w-0 w-0 focus:cursor-text focus:bg-white focus:px-2 focus:py-1 focus:rounded transition-all truncate ${
                activeTab === tab.id 
                  ? 'text-blue-900 font-bold text-sm sm:text-sm' 
                  : 'text-gray-700 font-medium text-sm sm:text-sm'
              }`}
            />
            {tabs.length > 1 && (
              <button
                className={`rounded-full flex items-center justify-center leading-none transition-all duration-200 flex-shrink-0 shadow-md touch-manipulation hover:scale-110 active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                    : 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white opacity-80 group-hover:opacity-100'
                }`}
                style={{
                  width: '20px',
                  height: '20px',
                  fontSize: '0.875rem',
                }}
                onClick={(e) => handleDeleteTab(tab.id, e)}
                title="Supprimer cet onglet"
                aria-label="Supprimer cet onglet"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg sm:rounded-t-md sm:mb-[-2px] font-light leading-none transition-all duration-300 ease-in-out shadow-md sm:shadow-[0_-1px_3px_rgba(0,0,0,0.08)] hover:shadow-lg sm:hover:shadow-[0_-2px_5px_rgba(0,0,0,0.12)] border-t-2 border-transparent flex-shrink-0 touch-manipulation flex items-center justify-center hover:scale-105 active:scale-95 sm:max-w-[60px]"
          style={{
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem',
            minHeight: '48px',
            fontSize: '1.25rem',
            minWidth: '40px',
          }}
          onClick={handleAddTab}
          title="Ajouter un niveau"
          aria-label="Ajouter un niveau"
        >
          +
        </button>
      </div>

      {/* Tabs Content - Responsive optimisé mobile avec onglets de matières */}
      <div className="flex-1 bg-white overflow-y-auto flex flex-col">
        {activeTabData && activeTabData.matieres && activeTabData.matieres.length > 0 ? (
          <div className="flex flex-col h-full">
            {/* Section Header Matières */}
            <div className="bg-green-50 border-b-2 border-green-200 px-3 sm:px-4 py-2 sm:py-2.5">
              <h3 className="text-xs sm:text-sm font-semibold text-green-700 uppercase tracking-wide flex items-center gap-2">
                <span className="text-base">📖</span>
                <span>Matières - {activeTabData.label}</span>
              </h3>
            </div>
            
            {/* Onglets des matières */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end bg-gray-50 border-b-2 border-gray-200 gap-1 sm:gap-1 px-2 sm:px-1 py-2 sm:py-1 overflow-x-auto sm:overflow-x-hidden">
              {activeTabData.matieres.map((matiere) => (
                <div
                  key={matiere.id}
                  className={`relative cursor-pointer transition-all duration-300 ease-in-out flex items-center justify-between gap-2 sm:gap-1.5 flex-1 sm:flex-[0.75] sm:max-w-[200px] min-w-0 group ${
                    activeMatiereId === matiere.id
                      ? "bg-green-200 border-l-4 sm:border-l-0 sm:border-b-4 border-green-600 shadow-lg sm:shadow-[0_-4px_8px_rgba(34,197,94,0.4)] z-10 rounded-lg sm:rounded-t-md sm:mb-[-2px] transform scale-[1.02]"
                      : "bg-white hover:bg-green-50 active:bg-green-100 shadow-sm sm:shadow-[0_-1px_3px_rgba(0,0,0,0.08)] rounded-lg sm:rounded-t-md sm:mb-[-2px] hover:scale-[1.01]"
                  }`}
                  style={{
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    paddingLeft: '0.875rem',
                    paddingRight: '0.875rem',
                    minHeight: '48px',
                  }}
                  onClick={() => handleMatiereClick(activeTab, matiere.id)}
                >
                  <input
                    type="text"
                    value={matiere.label}
                    onChange={(e) => handleMatiereLabelChange(activeTab, matiere.id, e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Si on n'est pas en mode édition, empêche le focus et active juste l'onglet
                      const matiereKey = `${activeTab}-${matiere.id}`;
                      if (editingMatiere !== matiereKey) {
                        e.preventDefault();
                        e.target.blur();
                        handleMatiereClick(activeTab, matiere.id);
                      }
                    }}
                    onDoubleClick={(e) => {
                      // Double-clic pour sélectionner le texte et permettre l'édition
                      e.stopPropagation();
                      e.preventDefault();
                      handleMatiereClick(activeTab, matiere.id);
                      const matiereKey = `${activeTab}-${matiere.id}`;
                      setEditingMatiere(matiereKey);
                      // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
                      requestAnimationFrame(() => {
                        e.target.focus();
                        e.target.select();
                      });
                    }}
                    onBlur={() => {
                      // Termine l'édition quand on perd le focus
                      const id = matiere.id;
                      const niveauId = activeTab;
                      const matiereKey = `${niveauId}-${id}`;
                      if (editingMatiere === matiereKey) {
                        setEditingMatiere(null);
                        // Sauvegarde en base lorsque l'édition est réellement terminée
                        saveMatiereLabel(niveauId, id);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Appuyer sur Enter ou Escape pour terminer l'édition
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.target.blur();
                      }
                    }}
                    onFocus={(e) => {
                      // Si on n'est pas en mode édition, empêche le focus
                      const matiereKey = `${activeTab}-${matiere.id}`;
                      if (editingMatiere !== matiereKey) {
                        e.target.blur();
                      }
                    }}
                    readOnly={editingMatiere !== `${activeTab}-${matiere.id}`}
                    tabIndex={editingMatiere === `${activeTab}-${matiere.id}` ? 0 : -1}
                    className={`flex-1 border-none bg-transparent p-0 m-0 outline-none cursor-pointer min-w-0 w-0 focus:cursor-text focus:bg-white focus:px-2 focus:py-1 focus:rounded transition-all truncate ${
                      activeMatiereId === matiere.id 
                        ? 'text-green-900 font-bold text-sm sm:text-sm' 
                        : 'text-gray-700 font-medium text-sm sm:text-sm'
                    }`}
                  />
                  {activeTabData.matieres.length > 1 && (
                    <button
                      className={`rounded-full flex items-center justify-center leading-none transition-all duration-200 flex-shrink-0 shadow-md touch-manipulation hover:scale-110 active:scale-95 ${
                        activeMatiereId === matiere.id
                          ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                          : 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white opacity-80 group-hover:opacity-100'
                      }`}
                      style={{
                        width: '20px',
                        height: '20px',
                        fontSize: '0.875rem',
                      }}
                      onClick={(e) => handleDeleteMatiere(activeTab, matiere.id, e)}
                      title="Supprimer cette matière"
                      aria-label="Supprimer cette matière"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                className="bg-white text-gray-600 hover:text-green-600 hover:bg-green-50 active:bg-green-100 rounded-lg sm:rounded-t-md sm:mb-[-2px] font-light leading-none transition-all duration-300 ease-in-out shadow-md sm:shadow-[0_-1px_3px_rgba(0,0,0,0.08)] hover:shadow-lg sm:hover:shadow-[0_-2px_5px_rgba(0,0,0,0.12)] border-t-2 border-transparent flex-shrink-0 touch-manipulation flex items-center justify-center hover:scale-105 active:scale-95 sm:max-w-[60px]"
                style={{
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  paddingLeft: '0.75rem',
                  paddingRight: '0.75rem',
                  minHeight: '48px',
                  fontSize: '1.25rem',
                  minWidth: '40px',
                }}
                onClick={() => handleAddMatiere(activeTab)}
                title="Ajouter une matière"
                aria-label="Ajouter une matière"
              >
                +
              </button>
            </div>

            {/* Contenu de la matière sélectionnée avec onglets de chapitres */}
            <div className="flex-1 bg-white overflow-hidden flex flex-col">
              {activeMatiereData && activeMatiereData.chapitres && activeMatiereData.chapitres.length > 0 ? (
                <div className="flex flex-col h-full">
                  {/* Section Header Chapitres */}
                  <div className="bg-purple-50 border-b-2 border-purple-200 px-3 sm:px-4 py-2 sm:py-2.5">
                    <h4 className="text-xs sm:text-sm font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-2">
                      <span className="text-base">📝</span>
                      <span>Chapitres - {activeMatiereData.label}</span>
                    </h4>
                  </div>
                  
                  {/* Onglets des chapitres */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end bg-gray-50 border-b-2 border-gray-200 gap-1 sm:gap-1 px-2 sm:px-1 py-2 sm:py-1 overflow-x-auto sm:overflow-x-hidden">
                    {activeMatiereData.chapitres.map((chapitre) => (
                      <div
                        key={chapitre.id}
                        className={`relative cursor-pointer transition-all duration-300 ease-in-out flex items-center justify-between gap-2 sm:gap-1.5 flex-1 sm:flex-[0.5] sm:max-w-[150px] min-w-0 group ${
                          activeChapitreId === chapitre.id
                            ? "bg-purple-200 border-l-4 sm:border-l-0 sm:border-b-4 border-purple-600 shadow-lg sm:shadow-[0_-4px_8px_rgba(168,85,247,0.4)] z-10 rounded-lg sm:rounded-t-md sm:mb-[-2px] transform scale-[1.02]"
                            : "bg-white hover:bg-purple-50 active:bg-purple-100 shadow-sm sm:shadow-[0_-1px_3px_rgba(0,0,0,0.08)] rounded-lg sm:rounded-t-md sm:mb-[-2px] hover:scale-[1.01]"
                        }`}
                        style={{
                          paddingTop: '0.875rem',
                          paddingBottom: '0.875rem',
                          paddingLeft: '0.875rem',
                          paddingRight: '0.875rem',
                          minHeight: '48px',
                        }}
                        onClick={() => handleChapitreClick(activeTab, activeMatiereId, chapitre.id)}
                      >
                        <input
                          type="text"
                          value={chapitre.label}
                          onChange={(e) => handleChapitreLabelChange(activeTab, activeMatiereId, chapitre.id, e.target.value)}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Si on n'est pas en mode édition, empêche le focus et active juste l'onglet
                            const chapitreKey = `${activeTab}-${activeMatiereId}-${chapitre.id}`;
                            if (editingChapitre !== chapitreKey) {
                              e.preventDefault();
                              e.target.blur();
                              handleChapitreClick(activeTab, activeMatiereId, chapitre.id);
                            }
                          }}
                          onDoubleClick={(e) => {
                            // Double-clic pour sélectionner le texte et permettre l'édition
                            e.stopPropagation();
                            e.preventDefault();
                            handleChapitreClick(activeTab, activeMatiereId, chapitre.id);
                            const chapitreKey = `${activeTab}-${activeMatiereId}-${chapitre.id}`;
                            setEditingChapitre(chapitreKey);
                            // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
                            requestAnimationFrame(() => {
                              e.target.focus();
                              e.target.select();
                            });
                          }}
                          onBlur={() => {
                            // Termine l'édition quand on perd le focus et sauvegarde en base
                            const chapitreKey = `${activeTab}-${activeMatiereId}-${chapitre.id}`;
                            if (editingChapitre === chapitreKey) {
                              setEditingChapitre(null);
                              saveChapitreLabel(activeTab, activeMatiereId, chapitre.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Appuyer sur Enter ou Escape pour terminer l'édition
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              e.target.blur();
                            }
                          }}
                          onFocus={(e) => {
                            // Si on n'est pas en mode édition, empêche le focus
                            const chapitreKey = `${activeTab}-${activeMatiereId}-${chapitre.id}`;
                            if (editingChapitre !== chapitreKey) {
                              e.target.blur();
                            }
                          }}
                          readOnly={editingChapitre !== `${activeTab}-${activeMatiereId}-${chapitre.id}`}
                          tabIndex={editingChapitre === `${activeTab}-${activeMatiereId}-${chapitre.id}` ? 0 : -1}
                          className={`flex-1 border-none bg-transparent p-0 m-0 outline-none cursor-pointer min-w-0 w-0 focus:cursor-text focus:bg-white focus:px-2 focus:py-1 focus:rounded transition-all truncate ${
                            activeChapitreId === chapitre.id 
                              ? 'text-purple-900 font-bold text-sm sm:text-sm' 
                              : 'text-gray-700 font-medium text-sm sm:text-sm'
                          }`}
                        />
                        {activeMatiereData.chapitres.length > 1 && (
                          <button
                            className={`rounded-full flex items-center justify-center leading-none transition-all duration-200 flex-shrink-0 shadow-md touch-manipulation hover:scale-110 active:scale-95 ${
                              activeChapitreId === chapitre.id
                                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                                : 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white opacity-80 group-hover:opacity-100'
                            }`}
                            style={{
                              width: '20px',
                              height: '20px',
                              fontSize: '0.875rem',
                            }}
                            onClick={(e) => handleDeleteChapitre(activeTab, activeMatiereId, chapitre.id, e)}
                            title="Supprimer ce chapitre"
                            aria-label="Supprimer ce chapitre"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="bg-white text-gray-600 hover:text-purple-600 hover:bg-purple-50 active:bg-purple-100 rounded-lg sm:rounded-t-md sm:mb-[-2px] font-light leading-none transition-all duration-300 ease-in-out shadow-md sm:shadow-[0_-1px_3px_rgba(0,0,0,0.08)] hover:shadow-lg sm:hover:shadow-[0_-2px_5px_rgba(0,0,0,0.12)] border-t-2 border-transparent flex-shrink-0 touch-manipulation flex items-center justify-center hover:scale-105 active:scale-95 sm:max-w-[50px]"
                      style={{
                        paddingTop: '0.75rem',
                        paddingBottom: '0.75rem',
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem',
                        minHeight: '48px',
                        fontSize: '1.25rem',
                        minWidth: '40px',
                      }}
                      onClick={() => handleAddChapitre(activeTab, activeMatiereId)}
                      title="Ajouter un chapitre"
                      aria-label="Ajouter un chapitre"
                    >
                      +
                    </button>
                  </div>

                  {/* Contenu du chapitre sélectionné */}
                  <div className="flex-1 bg-gradient-to-br from-purple-50/30 to-white p-4 sm:p-6 md:p-8 lg:p-10">
                    {activeChapitreData && (
                      <div className="w-full max-w-4xl mx-auto">
                        {/* Breadcrumb pour la navigation */}
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 flex-wrap">
                          <span className="text-blue-600 font-medium">{activeTabData.label}</span>
                          <span>›</span>
                          <span className="text-green-600 font-medium">{activeMatiereData.label}</span>
                          <span>›</span>
                          <span className="text-purple-600 font-semibold">{activeChapitreData.label}</span>
                        </div>
                        
                        {/* Titre du chapitre */}
                        <div className="mb-3 sm:mb-4 md:mb-6">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Titre du chapitre
                          </label>
                          <input
                            type="text"
                            value={activeChapitreData.label || ""}
                            onChange={(e) => handleChapitreLabelChange(activeTab, activeMatiereId, activeChapitreData.id, e.target.value)}
                            className="w-full border-2 border-gray-200 bg-white rounded-lg px-4 py-3 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all shadow-sm hover:border-gray-300"
                            placeholder="Nom du chapitre..."
                            style={{
                              fontSize: 'clamp(1rem, 4vw, 1.5rem)',
                            }}
                          />
                        </div>
                        
                        {/* Aperçu du contenu */}
                        {activeChapitreData.content && (
                          <div className="mb-4 sm:mb-6 md:mb-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aperçu</p>
                            <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed break-words whitespace-pre-wrap">
                              {activeChapitreData.content}
                            </p>
                          </div>
                        )}
                        
                        {/* Zone d'édition du contenu */}
                        <div className="mb-6">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                            Contenu du chapitre
                          </label>
                          <textarea
                            value={activeChapitreData.content || ""}
                            onChange={(e) =>
                              handleChapitreContentChange(activeTab, activeMatiereId, activeChapitreData.id, e.target.value)
                            }
                            onBlur={() => saveChapitreContent(activeTab, activeMatiereId, activeChapitreData.id)}
                            className="w-full border-2 border-gray-200 bg-white rounded-lg p-4 sm:p-5 md:p-6 text-sm sm:text-base md:text-lg text-gray-700 resize-y outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all min-h-[200px] sm:min-h-[250px] md:min-h-[300px] shadow-sm hover:border-gray-300 font-sans leading-relaxed"
                            placeholder="Saisissez le contenu de ce chapitre... Vous pouvez utiliser plusieurs lignes pour organiser votre texte."
                            rows="8"
                            style={{
                              fontSize: 'clamp(0.875rem, 3vw, 1rem)',
                            }}
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            {activeChapitreData.content?.length || 0} caractères
                          </p>
                        </div>

                        {/* Section Paragraphes */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide">
                              📄 Paragraphes
                            </label>
                            <button
                              onClick={() => handleAddParagraphe(activeChapitreData.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              + Ajouter
                            </button>
                          </div>
                          {activeChapitreData.paragraphes && activeChapitreData.paragraphes.length > 0 ? (
                            <div className="space-y-2">
                              {activeChapitreData.paragraphes.map((para, idx) => (
                                <div key={para.id || idx} className="bg-white p-3 rounded border border-blue-200 flex items-start gap-2">
                                  <textarea
                                    value={para.contenu || ""}
                                    onChange={(e) => {
                                      const newContenu = e.target.value;
                                      setTabs((prevTabs) =>
                                        prevTabs.map((tab) =>
                                          tab.id === activeTab
                                            ? {
                                                ...tab,
                                                matieres: (tab.matieres || []).map((m) =>
                                                  m.id === activeMatiereId
                                                    ? {
                                                        ...m,
                                                        chapitres: (m.chapitres || []).map((c) =>
                                                          c.id === activeChapitreData.id
                                                            ? {
                                                                ...c,
                                                                paragraphes: (c.paragraphes || []).map((p) =>
                                                                  p.id === para.id ? { ...p, contenu: newContenu } : p
                                                                ),
                                                              }
                                                            : c
                                                        ),
                                                      }
                                                    : m
                                                ),
                                              }
                                            : tab
                                        )
                                      );
                                    }}
                                    onBlur={() => handleUpdateParagraphe(para.id, para.contenu)}
                                    className="flex-1 border border-gray-200 rounded p-2 text-sm"
                                    placeholder="Contenu du paragraphe..."
                                    rows="3"
                                  />
                                  <button
                                    onClick={() => handleDeleteParagraphe(para.id, activeChapitreData.id)}
                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 mt-1"
                                    title="Supprimer"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Aucun paragraphe pour le moment</p>
                          )}
                        </div>

                        {/* Section Module Validation */}
                        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold text-yellow-700 uppercase tracking-wide">
                              ✅ Module de Validation
                            </label>
                            <button
                              onClick={() => handleAddModuleValidation(activeChapitreData.id)}
                              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                            >
                              + Ajouter
                            </button>
                          </div>
                          {activeChapitreData.moduleValidations && activeChapitreData.moduleValidations.length > 0 ? (
                            <div className="space-y-3">
                              {activeChapitreData.moduleValidations.map((module, idx) => (
                                <div key={module.id || idx} className="bg-white p-4 rounded border border-yellow-200">
                                  <div className="flex items-start gap-2 mb-3">
                                    <textarea
                                      value={module.contenu || ""}
                                      onChange={(e) => {
                                        const newContenu = e.target.value;
                                        setTabs((prevTabs) =>
                                          prevTabs.map((tab) =>
                                            tab.id === activeTab
                                              ? {
                                                  ...tab,
                                                  matieres: (tab.matieres || []).map((m) =>
                                                    m.id === activeMatiereId
                                                      ? {
                                                          ...m,
                                                          chapitres: (m.chapitres || []).map((c) =>
                                                            c.id === activeChapitreData.id
                                                              ? {
                                                                  ...c,
                                                                  moduleValidations: (c.moduleValidations || []).map((mod) =>
                                                                    mod.id === module.id ? { ...mod, contenu: newContenu } : mod
                                                                  ),
                                                                }
                                                              : c
                                                          ),
                                                        }
                                                      : m
                                                  ),
                                                }
                                              : tab
                                          )
                                        );
                                      }}
                                      onBlur={() => handleUpdateModuleValidation(module.id, module.contenu)}
                                      className="flex-1 border border-gray-200 rounded p-2 text-sm"
                                      placeholder="Contenu du module de validation..."
                                      rows="2"
                                    />
                                    <button
                                      onClick={() => handleDeleteModuleValidation(module.id, activeChapitreData.id)}
                                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                      title="Supprimer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <p>🎬 Animations maison: {module.animations_maison_count || 0}</p>
                                    <p>🎮 Mini jeux: {module.mini_jeux_count || 0}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Aucun module de validation pour le moment</p>
                          )}
                        </div>

                        {/* Section Mini Jeux */}
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide">
                              🎮 Mini Jeux
                            </label>
                            <button
                              onClick={() => setMiniJeuTypeModal({ chapitreId: activeChapitreData.id })}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              + Ajouter
                            </button>
                          </div>
                          {activeChapitreData.miniJeux && activeChapitreData.miniJeux.length > 0 ? (
                            <div className="space-y-2">
                              {activeChapitreData.miniJeux.map((jeu, idx) => (
                                <div key={jeu.id || idx} className="bg-white p-3 rounded border border-green-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-green-700">Type: {jeu.type || 'N/A'}</span>
                                    <button
                                      onClick={() => handleDeleteMiniJeu(jeu.id, activeChapitreData.id)}
                                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                      title="Supprimer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {jeu.question && (
                                    <p className="text-sm text-gray-700 mb-1">Question: {jeu.question}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Aucun mini jeu pour le moment</p>
                          )}
                        </div>

                        {/* Section Exercices */}
                        <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide">
                              📝 Exercices
                            </label>
                            <button
                              onClick={() => handleAddExercice(activeChapitreData.id)}
                              className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                            >
                              + Ajouter
                            </button>
                          </div>
                          {activeChapitreData.exercices && activeChapitreData.exercices.length > 0 ? (
                            <div className="space-y-3">
                              {activeChapitreData.exercices.map((exercice, idx) => (
                                <div key={exercice.id || idx} className="bg-white p-4 rounded border border-purple-200">
                                  <div className="flex items-start gap-2 mb-3">
                                    <textarea
                                      value={exercice.contenu || ""}
                                      onChange={(e) => {
                                        const newContenu = e.target.value;
                                        setTabs((prevTabs) =>
                                          prevTabs.map((tab) =>
                                            tab.id === activeTab
                                              ? {
                                                  ...tab,
                                                  matieres: (tab.matieres || []).map((m) =>
                                                    m.id === activeMatiereId
                                                      ? {
                                                          ...m,
                                                          chapitres: (m.chapitres || []).map((c) =>
                                                            c.id === activeChapitreData.id
                                                              ? {
                                                                  ...c,
                                                                  exercices: (c.exercices || []).map((ex) =>
                                                                    ex.id === exercice.id ? { ...ex, contenu: newContenu } : ex
                                                                  ),
                                                                }
                                                              : c
                                                          ),
                                                        }
                                                      : m
                                                  ),
                                                }
                                              : tab
                                          )
                                        );
                                      }}
                                      onBlur={() => handleUpdateExercice(exercice.id, exercice.contenu)}
                                      className="flex-1 border border-gray-200 rounded p-2 text-sm"
                                      placeholder="Contenu de l'exercice..."
                                      rows="2"
                                    />
                                    <button
                                      onClick={() => handleDeleteExercice(exercice.id, activeChapitreData.id)}
                                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                      title="Supprimer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <p>❓ Questions/Réponses: {exercice.questions_reponses_count || 0}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Aucun exercice pour le moment</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-white p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto flex items-center justify-center">
                  <div className="text-center max-w-md space-y-4">
                    <div className="text-6xl mb-2">📚</div>
                    <p className="text-gray-600 text-lg font-medium">Aucun chapitre disponible</p>
                    <p className="text-gray-500 text-sm">
                      Ajoutez votre premier chapitre pour cette matière.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddChapitre(activeTab, activeMatiereId)}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                    >
                      <span className="mr-2 text-lg">+</span>
                      <span>Ajouter un chapitre</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto flex items-center justify-center">
            <div className="text-center max-w-md space-y-4">
              <div className="text-6xl mb-2">📖</div>
              <p className="text-gray-600 text-lg font-medium">Aucune matière disponible</p>
              <p className="text-gray-500 text-sm">
                Ajoutez votre première matière pour ce niveau.
              </p>
              <button
                type="button"
                onClick={() => handleAddMatiere(activeTab)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              >
                <span className="mr-2 text-lg">+</span>
                <span>Ajouter une matière</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de confirmation */}
      {confirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => confirmModal.onCancel && confirmModal.onCancel()}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b ${
              confirmModal.type === 'error' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmModal.type === 'error'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-orange-100 text-orange-600'
                }`}>
                  {confirmModal.type === 'error' ? (
                    <span className="text-xl">⚠️</span>
                  ) : (
                    <span className="text-xl">🗑️</span>
                  )}
                </div>
                <h3 className={`text-lg font-bold ${
                  confirmModal.type === 'error'
                    ? 'text-red-900'
                    : 'text-orange-900'
                }`}>
                  {confirmModal.title}
                </h3>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-gray-700 text-base mb-2">
                {confirmModal.message}
              </p>
              {confirmModal.warning && (
                <p className="text-orange-600 text-sm font-medium mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  ⚠️ {confirmModal.warning}
                </p>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              {confirmModal.onCancel && (
                <button
                  onClick={confirmModal.onCancel}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                  confirmModal.type === 'error'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmModal.type === 'error' ? 'OK' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection du type de mini jeu */}
      {miniJeuTypeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setMiniJeuTypeModal(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 transform transition-all max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-green-900">
                  🎮 Choisir le type de mini jeu
                </h3>
                <button
                  onClick={() => setMiniJeuTypeModal(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Body - Liste des types */}
            <div className="px-6 py-4">
              <p className="text-gray-600 text-sm mb-4">
                Sélectionnez le type de mini jeu que vous souhaitez ajouter à ce chapitre :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {miniJeuTypes.map((gameType) => (
                  <button
                    key={gameType.value}
                    onClick={() => handleSelectMiniJeuType(miniJeuTypeModal.chapitreId, gameType.value)}
                    className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{gameType.icon}</span>
                      <div>
                        <div className="font-semibold text-green-900 group-hover:text-green-700">
                          {gameType.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {gameType.value}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setMiniJeuTypeModal(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de prévisualisation du mini jeu */}
      {previewModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setPreviewModal(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 transform transition-all max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-blue-900">
                    👁️ Aperçu - {miniJeuTypes.find(gt => gt.value === previewModal.gameType)?.label || previewModal.gameType}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Voici comment ce mini jeu apparaîtra pour les utilisateurs
                  </p>
                </div>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Body - Prévisualisation */}
            <div className="px-6 py-6">
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Simulation utilisateur</p>
                {renderPreview(previewModal.gameType)}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleAddMiniJeu(previewModal.chapitreId, previewModal.gameType)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ✓ Créer ce mini jeu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

