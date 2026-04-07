import type { DocumentationContent } from "@/types";

export const DEFAULT_DOCUMENTATION_CONTENT: DocumentationContent = {
  hero: {
    title: "Dataset IA, expliquee pour toute l'equipe",
    subtitle:
      "Cette page centralise la vision produit, les points techniques pour les developpeurs, et un plan QA complet.",
  },
  overview: {
    title: "Presentation de l'application",
    intro:
      "Dataset IA est une plateforme de gestion de connaissances et d'assistant conversationnel. Le flux principal suit ce chemin: creer un projet, alimenter la base de connaissances, dialoguer avec l'IA, puis piloter la qualite via analytics et support.",
    modules: [
      {
        title: "Gestion des projets",
        points: [
          "Creation, edition et suppression des datasets/projets.",
          "Configuration de chaque projet et activation/desactivation.",
          "Pilotage des cles API projet (reveler, rotation, revocation).",
        ],
      },
      {
        title: "Base de connaissance IA",
        points: [
          "Import de documents (.pdf, .md, .txt, .docx, .html, .csv).",
          "Indexation RAG et reconstruction de l'index vectoriel.",
          "Espace FAQ pour injecter des Q/R directement exploitables.",
        ],
      },
      {
        title: "Experience conversationnelle",
        points: [
          "Conversations associees a un projet via son API key.",
          "Historique des discussions et reprise de contexte.",
          "Suivi des performances: satisfaction, top questions, erreurs.",
        ],
      },
      {
        title: "Support et operations",
        points: [
          "Tickets support utilisateur et suivi de statut admin.",
          "Page analytics pour monitorer usage et qualite de reponse.",
          "Administration des comptes (approbation et gouvernance).",
        ],
      },
    ],
  },
  dev: {
    title: "Fonctionnalites techniques et integration API externe",
    intro:
      "L'application s'appuie sur un mode hybride JWT (operations utilisateur) + X-API-Key (operations de base de connaissances par projet). Cette separation permet de cloisonner les droits et de brancher des flux externes sans exposer les sessions utilisateurs.",
    cards: [
      {
        title: "Authentification",
        description: "JWT pour les vues dashboard, API key par projet pour l'ingestion RAG.",
      },
      {
        title: "Source externe",
        description: "Connecteur ETL simple: fetch API externe, transformation, puis upload en lot.",
      },
      {
        title: "Validation",
        description: "Controle post-ingestion via status fichiers, chat de test et analytics de pertinence.",
      },
    ],
    integration_steps: [
      "Creer ou ouvrir un projet dans /projects puis recuperer la cle API du projet.",
      "Normaliser les donnees de l'API externe (JSON, HTML ou CSV) vers un format lisible (txt/md/csv).",
      "Uploader les fichiers dans la base RAG via l'endpoint /projects/:id/rag/files avec X-API-Key.",
      "Verifier l'etat d'indexation (ready/processing/error) et lancer un rebuild si necessaire.",
      "Tester le chat sur le projet et controler les analytics pour valider la pertinence des reponses.",
    ],
    payload_example:
      "Q: Quelle est la politique de remboursement ?\nR: Remboursement total jusqu'a 14 jours, puis prorata selon le contrat.\n\nQ: Delai de traitement d'un ticket support ?\nR: SLA standard 24h ouvrees, 4h pour incidents critiques.",
  },
  qa: {
    title: "Plan de test global et detaille",
    intro:
      "Cette matrice couvre le comportement fonctionnel, la robustesse et la qualite visuelle. Le but est d'eviter les angles morts: chaque zone de l'application doit etre validee sur les flux heureux, les erreurs metier et les cas limites.",
    strategy: [
      "Smoke test quotidien: auth, navigation, chargement des vues principales, acces API backend.",
      "Regression complete a chaque release candidate sur desktop + mobile.",
      "Verification des roles (user, user non approuve, admin) et permissions associees.",
      "Verification UX: etats loading, skeletons, erreurs, toasts, vide de donnees et retours de succes.",
      "Verification securite de base: expiration token, reutilisation API key invalide, acces refuse aux routes protegees.",
    ],
    area_checks: [
      {
        area: "Authentification",
        checks: "Inscription, connexion, refresh token, deconnexion, blocage compte non approuve.",
      },
      {
        area: "Dashboard & navigation",
        checks: "Etat des KPIs, coherence des liens, navigation sidebar/header, rendu responsive.",
      },
      {
        area: "Projets & fichiers RAG",
        checks: "CRUD projet, rotation/revocation de cle, upload formats supportes, limites taille, statuts fichiers, suppression/rebuild.",
      },
      {
        area: "Chat IA",
        checks: "Creation conversation, reprise historique, changement de projet, gestion erreurs API et latence.",
      },
      {
        area: "FAQ",
        checks: "Ajout/suppression d'entrees, format Q/R, impact sur reponses IA, coexistence avec autres documents RAG.",
      },
      {
        area: "Analytics & support",
        checks: "KPIs par periode, export CSV, top questions, queries en echec, creation/reponse tickets support.",
      },
      {
        area: "Administration",
        checks: "Visibilite reservee admin, approbation comptes, controles de securite sur actions sensibles.",
      },
    ],
  },
};

export function normalizeDocumentationContent(input: unknown): DocumentationContent {
  if (!input || typeof input !== "object") return DEFAULT_DOCUMENTATION_CONTENT;
  const raw = input as Partial<DocumentationContent>;

  return {
    hero: {
      title: raw.hero?.title?.trim() || DEFAULT_DOCUMENTATION_CONTENT.hero.title,
      subtitle: raw.hero?.subtitle?.trim() || DEFAULT_DOCUMENTATION_CONTENT.hero.subtitle,
    },
    overview: {
      title: raw.overview?.title?.trim() || DEFAULT_DOCUMENTATION_CONTENT.overview.title,
      intro: raw.overview?.intro?.trim() || DEFAULT_DOCUMENTATION_CONTENT.overview.intro,
      modules:
        raw.overview?.modules?.filter((m) => m.title?.trim()).map((m) => ({
          title: m.title.trim(),
          points: (m.points ?? []).map((p) => p.trim()).filter(Boolean),
        })) || DEFAULT_DOCUMENTATION_CONTENT.overview.modules,
    },
    dev: {
      title: raw.dev?.title?.trim() || DEFAULT_DOCUMENTATION_CONTENT.dev.title,
      intro: raw.dev?.intro?.trim() || DEFAULT_DOCUMENTATION_CONTENT.dev.intro,
      cards:
        raw.dev?.cards?.filter((c) => c.title?.trim()).map((c) => ({
          title: c.title.trim(),
          description: c.description?.trim() || "",
        })) || DEFAULT_DOCUMENTATION_CONTENT.dev.cards,
      integration_steps:
        raw.dev?.integration_steps?.map((s) => s.trim()).filter(Boolean) ||
        DEFAULT_DOCUMENTATION_CONTENT.dev.integration_steps,
      payload_example:
        raw.dev?.payload_example?.trim() || DEFAULT_DOCUMENTATION_CONTENT.dev.payload_example,
    },
    qa: {
      title: raw.qa?.title?.trim() || DEFAULT_DOCUMENTATION_CONTENT.qa.title,
      intro: raw.qa?.intro?.trim() || DEFAULT_DOCUMENTATION_CONTENT.qa.intro,
      strategy:
        raw.qa?.strategy?.map((s) => s.trim()).filter(Boolean) ||
        DEFAULT_DOCUMENTATION_CONTENT.qa.strategy,
      area_checks:
        raw.qa?.area_checks
          ?.filter((a) => a.area?.trim())
          .map((a) => ({
            area: a.area.trim(),
            checks: a.checks?.trim() || "",
          })) || DEFAULT_DOCUMENTATION_CONTENT.qa.area_checks,
    },
  };
}
