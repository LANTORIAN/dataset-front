# Contexte du dépôt — Workspace agentique Next.js

Administration projets/connaissance/configuration, chat et cartes de catalogue. Ce frontend consomme un backend agentique compatible ; la proximité d'un autre dossier sur un poste ne définit pas l'API déployée. [Présentation/architecture](README.md) et [état/reprise](ETAT_ET_REPRISE.md) sont embarqués ici.

## Sources et consignes locales

[AGENTS.md](../../AGENTS.md), [package.json](../../package.json), [services](../../services/), [types](../../types/). Le code utilise `app/`, `components/` et `lib/` directement à la racine, sans `src/`. Respecter les instructions de cette version Next.js avant une modification de code.

## État et parcours à vérifier

HEAD `c4d8ddd`, 10 septembre 2026 : conservation du slug catalogue après workspace, cartes/images et attente fournisseur. Tester projet/connexion, chat et terminaison SSE, source/carte, slug absent/présent et sauvegarde de configuration avec les droits correspondants.

## Assistant IA

Ne pas inventer slug, URL ou image pour rendre une carte plus complète. Modifier types et consommateur SSE ensemble avec le contrat attendu. Une sauvegarde UI n'est pas une preuve d'activation côté runtime. Les secrets restent côté serveur approprié ; les artefacts `.next` et `tsconfig.tsbuildinfo` ne sont pas des documents de source à transmettre.
