# Passation — Frontend Dataset / workspace agentique

> [Contexte du dépôt et guide pour l'assistant IA](CONTEXTE_DEPOT.md).

**Lecture approfondie : [dossier technique complet](PASSATION_DETAILLEE.md) · [schéma HTML interactif et expliqué](architecture.html) · [chronologie Git complète](HISTORIQUE_GIT.md).**

État : 29 octobre 2026. Branche `fix/catalog-slug`, HEAD `c4d8ddd` du 10 septembre 2026, YlanDecode ; arbre propre à l'inventaire.

## Mission, stack et architecture

Administration projets, connaissance, chat, analytics, configuration et recommandations catalogue. Next.js 16.2.1, React 19.2.4, TypeScript, Tailwind 4, Radix, Markdown/GFM et Sonner. Structure **sans `src/`** : `app/`, `components/`, `lib/`, `services/`, `types/`.

Pages → services/client → backend choisi → chat SSE/JSON et données projet → rendu cartes, sources et recommandations. Le frontend est plus récent que le backend voisin `llm-ai` : confirmer la cible, souvent une variante agentique, avant de déclarer une incompatibilité ou de retirer un champ.

- [Chronologie et reprise](ETAT_ET_REPRISE.md).

Points forts : rendu du catalogue, retour d'attente fournisseur et espace de configuration unifié. `AGENTS.md` impose de lire la documentation Next.js installée avant d'écrire du code dépendant de cette génération.
