# État et reprise — Frontend Dataset

| Date 2026 | Commit YlanDecode | Intervention |
|---|---|---|
| 19 août | `3e2c0e9` | Conservation du résultat de test de connexion DB. |
| 19 août | `c5c7e2a` | Cartes catalogue et attentes fournisseur. |
| 1er septembre | `34a0873` | Images de recommandations marketplace. |
| 4 septembre | `4d56feb` | Refonte du workspace agentique. |
| 4 septembre | `d0918cd` | Simplification analytics/configuration. |
| 10 septembre | `c4d8ddd` | Conservation des slugs reçus dans le payload. |

## Reprise

Lire `AGENTS.md`, la configuration de connexion et les services. Scripts : `npm run dev`, `npm run lint`, `npm run build` après installation. Obtenir l'URL du backend compatible, ses mécanismes de session et le contrat SSE ; ne pas déduire la cible du nom du dossier voisin.

Recetter projet, documents, chat, reconnexion/fin SSE, cartes et images, slug absent/présent, rôles et sauvegarde de configuration. Ne pas inventer un slug pour rendre une carte cliquable. `tsconfig.tsbuildinfo` et `.next/` sont des artefacts, pas des fichiers de passation à publier.

## Suite et assistant IA

Confirmer la paire de versions déployées et vérifier les parcours DB avec un compte limité. Préserver les identités catalogue, l'affichage d'attente fournisseur et la distinction erreur/liste vide. Mettre à jour types et consommateur SSE ensemble avec le backend.
