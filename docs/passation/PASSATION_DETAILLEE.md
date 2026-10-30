# Passation détaillée — Dataset IA — Workspace agentique, streaming et catalogue

<!-- passation-generated-v1; source=dossier.json; sha256=789e3a04c32984d8ed12c1c004ee4893aadd83ddf0cc3decd77f1c2ae1e53a8f -->

[Schéma HTML et lecture navigable](architecture.html) · [Index local](README.md) · [Historique Git complet](HISTORIQUE_GIT.md)

État documentaire : 2026-10-29. Référence : branche `fix/catalog-slug`, commit `c4d8ddd`.

## Sommaire

- Mission, périmètre et lecture
- Stack et rôle des technologies
- Carte des composants
- Responsabilités et localisation du code
- Échanges et frontières
- Déroulement des parcours
- Données, portée et cycle de vie
- Contrats et interfaces
- Configuration et prérequis
- Démarrage et exploitation
- Diagnostic et reprise sur erreur
- Vérification fonctionnelle
- Interventions et chronologie
- Ce qui est présent et niveau de preuve
- Points forts et raisons des choix
- Travaux restants et critères d'acceptation
- Guide de travail pour l'assistant IA
- Sources et documents complémentaires
- Maintenir cette passation

## Mission, périmètre et lecture

Cette application administre projets, connaissances, bases connectées, modèles, workflows et analytics, puis expose un chat avec réponses structurées et recommandations catalogue. Elle est plus récente que le backend voisin de juin et peut être configurée vers une variante agentique différente.

Le transport effectif du chat est un fetch POST avec X-API-Key et AbortController. Le commentaire ancien du service évoquant EventSource et clé en query ne décrit pas ce client. Il faut conserver le parseur SSE complet, les événements nommés et les états terminaux plutôt que concaténer arbitrairement des chunks réseau.

Les cartes et confirmations utilisent des identités fournies par le backend. Un slug reste facultatif ; les confirmations publiques vérifient instance/action/type/URL/statut/date et une idempotency_key. Une carte cliquable n'autorise pas l'invention d'un chemin ni une écriture métier générale.

### Frontière du dépôt

- Local : Next App Router sans src/, services/types, auth client, chat SSE v1/v2 selon contrat, catalogue et administration.
- Externe : backend configuré, providers, index, DB métier et campagne de certification.
- AGENTS.md impose la documentation Next installée avant modification de code de cette génération ; le dossier de passation ne remplace pas cette consigne.

Un fichier ou un commit prouve une implémentation/modification, pas un déploiement. Les validations historiques restent datées ; les contrôles de reprise proposés ne sont pas déclarés exécutés. Les systèmes externes du schéma sont des dépendances à obtenir, pas du code contenu dans ce dépôt.

## Stack et rôle des technologies

| Couche      | Version / référence                       | Rôle concret                                             | Source                           |
| ----------- | ----------------------------------------- | -------------------------------------------------------- | -------------------------------- |
| Application | Next 16.2.1 / React 19.2.4 / TypeScript   | app/, components/, lib/, services/, types/ à la racine.  | package.json ; AGENTS.md         |
| Style/UI    | Tailwind 4 / Radix / Sonner               | Workspace et états interactifs accessibles.              | package.json                     |
| Chat        | Fetch POST / SSE parser / AbortController | En-tête X-API-Key, événements complets et annulation.    | lib/api/client.ts                |
| Contrats    | Types et parseurs public v1/v2            | Texte, metadata, catalogue, progression et actions.      | services/chat.service.ts ; types |
| Contenu     | Markdown/GFM                              | Rendu de réponse et données structurées séparées.        | package.json ; components        |
| Qualité     | ESLint et build Next                      | Commandes du manifeste ; artefacts de build non sources. | package.json                     |

## Données, portée et cycle de vie

| Objet / stockage             | Source de vérité et contenu                 | Portée / lifecycle                            | Point de contrôle                                            |
| ---------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Contexte projet/conversation | Backend et état client                      | IDs et schéma v1/v2                           | Changer de projet invalide les données dérivées pertinentes. |
| Buffer SSE                   | État transport éphémère                     | UTF-8, lignes data et séparateurs d'événement | Ne pas parser un JSON par chunk réseau.                      |
| Payload public               | Objet validé                                | Texte, metadata, catalogue et actions         | Ne pas afficher les internals comme preuve client.           |
| Item/slug/image              | Catalogue backend                           | Identité et champs facultatifs réels          | Pas d'URL construite depuis le nom.                          |
| Action confirmation          | Instance/token/conversation/idempotency_key | Vérification stricte du retour                | Secrets/tokens non copiés dans captures ou logs.             |
| Test de connexion            | Résultat administratif                      | État lisible et conservé                      | Pas effacé par une modification cosmétique du formulaire.    |

## Contrats et interfaces

| Interface                                       | Entrée et identité                     | Sortie / effet                                           | Vérification et source                                              |
| ----------------------------------------------- | -------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| POST chat/stream v1/v2                          | X-API-Key et body de contexte          | SSE nommé ; schema_version chat.request.v2 si v2         | lib/api/client.ts ; transport effectif fetch POST.                  |
| chat_response_payload.v1 / PublicChatResponseV2 | Payload et version                     | Catalogue, données, actions et metadata                  | services/chat.service.ts et types ; vérifier compatibilité serveur. |
| POST v2 /chat/actions/{instance}/confirm        | Token, conversation et idempotency_key | action_confirmation_result.v1 strict                     | URL/IDs/type/label/date doivent correspondre.                       |
| Services projets/DB/workflow                    | Admin et projet                        | Configuration, test, readiness et campagne selon backend | Ne pas porter les endpoints d'une autre génération par supposition. |

## Configuration et prérequis

| Paramètre / dépendance        | Utilité et chargement            | Effet d'un mauvais réglage                          | Contrôle de reprise                                             |
| ----------------------------- | -------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| API base et contractVersion   | Client commun et environnement   | 404/événements non compris                          | Comparer cible effective et schéma avant de modifier le parser. |
| Clé de projet / session admin | Types d'identité distincts       | Refus ou fuite de credential                        | Ne pas placer clé provider dans un paramètre public.            |
| Connexion DB/models/workflow  | Configurations serveur du projet | Source déclarée mais non disponible                 | Lire readiness et résultat de test.                             |
| Next installé                 | Consigne AGENTS.md               | API du framework utilisée selon ancienne génération | Lire node_modules/next/dist/docs avant code Next.               |

## Diagnostic et reprise sur erreur

| Symptôme                          | Étape et hypothèses                     | Contrôle discriminant                   | Reprise et preuve attendue                                            |
| --------------------------------- | --------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| JSON invalide par intermittence   | Parser par chunk ou événement incomplet | Lire le buffer de lib/api/client.ts     | Conserver parsing par événement complet.                              |
| Commentaire annonce clé query     | Documentation ancienne du service       | Comparer l'implémentation fetch POST    | Mettre à jour la lecture, ne pas réintroduire EventSource par défaut. |
| Carte cliquable vers mauvaise URL | Slug inventé/perdu                      | Comparer payload et rendu               | Préserver l'identité catalogue, accepter champ absent.                |
| Done reçu deux fois               | Terminal/reconnexion non maîtrisés      | Vérifier terminal/stopped et stop()     | Une seule issue finale par requête.                                   |
| Confirmation rejetée              | Métadonnées ou réponse divergentes      | Comparer les champs strictement validés | Refuser, ne pas assouplir la comparaison pour naviguer.               |
| Test DB disparaît                 | État UI réinitialisé                    | Comparer au correctif 3e2c0e9           | Conserver résultat et distinguer config sale/readiness.               |

## Ce qui est présent et niveau de preuve

| Capacité              | Preuve disponible              | Limite de la preuve                   | Recette à conserver                        |
| --------------------- | ------------------------------ | ------------------------------------- | ------------------------------------------ |
| Workspace et services | Code présent                   | Backend voisin ne prouve pas la cible | Configuration réelle et projet de recette. |
| SSE Fetch POST        | Implémentation inspectée       | Commentaire ancien en décalage        | Fragmentation/annulation/terminal.         |
| Catalogue/slug        | Commits et parseur             | Données absentes non inventées        | Cartes avec champs facultatifs.            |
| Confirmation publique | Contrat strict dans le service | Pas permission d'écriture libre       | Cas divergents et rejeu sûr.               |
| Test DB               | État préservé par correctif    | Pas preuve de readiness éternelle     | Relecture serveur et erreurs.              |

## Travaux restants et critères d'acceptation

| Priorité             | Constat et source                     | Intervention recommandée                  | Critère d'acceptation                         |
| -------------------- | ------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| P1 paire de versions | Front septembre et backends multiples | Identifier la cible et recetter v1/v2     | Événements/types/confirmations compatibles.   |
| P1 robustesse stream | Fragmentation et sorties terminales   | Jeux de trames déterministes et coupures  | Aucune double fin ni JSON partiel interprété. |
| P1 droits            | Projet/admin/clé chat distincts       | Tester mutations et changement de projet  | Aucune donnée ou commande hors scope.         |
| P2 documentation     | Commentaire EventSource obsolète      | Aligner explication au fetch effectif     | Repreneur conserve header et POST.            |
| P2 UX sources        | Readiness/test et catalogue           | Recetter cas indisponibles/champs absents | Pas de succès ou lien inventé.                |

## Carte des composants

Ouvrir [architecture.html](architecture.html) pour le schéma SVG annoté et son zoom. Les responsabilités et échanges sont aussi décrits intégralement ci-dessous.

## Responsabilités et localisation du code

### Utilisateur / administrateur

Choisit le projet, son contexte et la version de contrat adaptée. L'administrateur configure les sources ; l'utilisateur de chat ne doit pas recevoir les secrets de providers.

- **Entrées :** Identité, projet et intention.
- **Sorties / effets :** Requête ou commande confirmée.
- **Erreur / frontière :** Une configuration visible n'est pas une source réellement prête.
- **Sources :** [app](../../app), [services/projects.service.ts](../../services/projects.service.ts)

### Pages et workspace

Présente les ressources et résultats de test de connexion, conserve états de chargement/erreur et rend la conversation. Les réglages ne sont actifs qu'après validation serveur.

- **Entrées :** Données de service et interactions.
- **Sorties / effets :** Commandes typées et état de présentation.
- **Erreur / frontière :** Ne pas perdre le résultat d'un test DB ni le remplacer par un succès local.
- **Sources :** [app](../../app), [components](../../components), [services](../../services)

### Client HTTP et SSE

Construit API v1/v2, injecte X-API-Key et lit le flux avec TextDecoder/buffer. Un événement n'est dispatché qu'après une ligne vide ; lignes data multiples et CRLF sont traitées.

- **Entrées :** Message, IDs de conversation/session/utilisateur/requête et version.
- **Sorties / effets :** Événements nommés ou erreur HTTP/réseau.
- **Erreur / frontière :** Une frontière de chunk réseau n'est pas une frontière d'événement SSE.
- **Sources :** [lib/api/client.ts](../../lib/api/client.ts)

### Service chat et validation publique

Interprète meta/done/error/progress et garde un terminal unique. Parse le payload public et les actions ; la confirmation exige des métadonnées complètes et une réponse identique à l'action proposée.

- **Entrées :** Événements et réponse du endpoint de confirmation.
- **Sorties / effets :** Texte, metadata finale, catalogue et action confirmée validée.
- **Erreur / frontière :** Ne pas considérer la fin réseau comme un résultat valide sans le protocole terminal attendu.
- **Sources :** [services/chat.service.ts](../../services/chat.service.ts)

### État, contexte et types

Conserve conversation/message et données de cartes sans inventer leurs identifiants. Le cache/contexte doit changer avec le projet et les permissions.

- **Entrées :** Payload validé et navigation.
- **Sorties / effets :** Rendu cohérent et références de suivi.
- **Erreur / frontière :** Le slug absent ne doit pas être calculé depuis un libellé.
- **Sources :** [types](../../types), [lib/context](../../lib/context), [lib/hooks](../../lib/hooks)

### Backend agentique configuré

Produit réponses et événements, contrôle sources et actions. Le frontend doit choisir le contrat correspondant à la cible réellement déployée, pas au dossier voisin.

- **Entrées :** Clé projet, message et schéma v1/v2.
- **Sorties / effets :** Payload, attente provider, refus et terminal.
- **Erreur / frontière :** Une erreur serveur ne se corrige pas par un item catalogue fictif ou une promotion locale.
- **Sources :** [services/workflow.service.ts](../../services/workflow.service.ts), [services/chat.service.ts](../../services/chat.service.ts)

## Échanges et frontières

| Relation                   | Déclenchement / contenu     | Mode    | Contrat et frontière                                                       |
| -------------------------- | --------------------------- | ------- | -------------------------------------------------------------------------- |
| 01 — user → workspace      | Navigation et intention     | sync    | Projet et rôle explicitement conservés.                                    |
| 02 — workspace → transport | Commande de service         | sync    | Version du contrat et identité dans le client commun.                      |
| 03 — transport → backend   | POST /chat/stream           | async   | X-API-Key en header et schéma v2 si demandé, pas EventSource query.        |
| 04 — transport → parser    | Événements SSE complets     | sync    | meta/progress/error/done ; buffer et CRLF correctement reconstruits.       |
| 05 — parser → state        | Payload et terminal validés | storage | Garde terminal/stopped et IDs de catalogue préservés.                      |
| 06 — parser → backend      | Confirmation d'action       | sync    | Instance, token et idempotency_key puis correspondance stricte de réponse. |

## Déroulement des parcours

### Chat stream et catalogue

**Déclencheur :** Envoi d'un message dans le projet choisi.

1. **Construction** — Choisir v1/v2 et remplir les IDs de contexte. Résultat / contrôle : Aucun secret provider inclus dans le body.
2. **Transport** — Fetch POST avec clé projet et AbortController. Résultat / contrôle : Erreur HTTP différenciée d'une coupure de stream.
3. **Parsing** — Accumuler événements complets et lire leur nom. Résultat / contrôle : Chunk, ligne data et événement final sont distincts.
4. **Projection** — Parser texte/meta/catalogue et progression. Résultat / contrôle : Attente fournisseur ne devient pas réponse terminée.
5. **Terminal** — Déclencher done ou error une seule fois et conserver IDs. Résultat / contrôle : Stop utilisateur n'entraîne pas un nouveau succès fictif.
6. **Rendu** — Afficher les cartes avec slug/image réels. Résultat / contrôle : Champ facultatif absent reste absent.

**Succès métier :** Réponse structurée complète, progression compréhensible et cartes fidèles aux sources.

**Rejeu / incident :** Annulation/reconnexion ne doit pas dupliquer le message ou une action ; conserver request/conversation IDs selon contrat.

### Confirmer une action publique

**Déclencheur :** L'utilisateur confirme une action qui exige une confirmation.

1. **Préconditions** — Exiger confirmation_required, instance et token. Résultat / contrôle : Refuser les métadonnées incomplètes.
2. **Commande** — Envoyer conversation_id, idempotency_key et token au endpoint v2. Résultat / contrôle : Une intention = une clé d'idempotence stable.
3. **Validation** — Comparer schéma, IDs, label, type, URL sûre, statut et date. Résultat / contrôle : Une réponse divergente est rejetée.
4. **Suite UI** — Appliquer seulement la navigation/action permise et validée. Résultat / contrôle : Pas d'écriture arbitraire déduite du mot confirmed.

**Succès métier :** Action confirmée exactement conforme à la proposition persistée.

**Rejeu / incident :** Réutiliser l'idempotency_key appropriée ; ne pas créer un nouvel effet parce que le transport a été lent.

### Configurer et tester une source DB

**Déclencheur :** Administrateur modifie une connexion/réglage.

1. **Formulaire** — Charger la configuration du projet et les droits. Résultat / contrôle : Distinguer brouillon et version serveur.
2. **Test** — Appeler le service project-database/project-sql. Résultat / contrôle : Conserver le résultat du test même après interaction UI.
3. **Relecture** — Relire configuration/readiness depuis le serveur. Résultat / contrôle : Source déclarée n'est pas source prête.
4. **Chat** — Tester une question autorisée avec le backend cible. Résultat / contrôle : Pas de réponse inventée si la source est indisponible.

**Succès métier :** Configuration et preuve de disponibilité cohérentes dans le projet.

**Rejeu / incident :** Ne pas changer le provider ou promouvoir un workflow pour masquer une panne de connexion.

## Démarrage et exploitation

### Préparer et lancer

**Préconditions :** Backend compatible et identités de recette ; lire AGENTS.md.

```text
git status --short
npm install
npm run dev
```

**Attendu :** Workspace connecté au contrat choisi.

**Effets et limites :** Les commandes de configuration peuvent modifier le serveur ; isoler le projet.

### Contrôles frontend

**Préconditions :** Dépendances/variables et docs Next de la version installée.

```text
npm run lint
npm run build
```

**Attendu :** Types/rendu cohérents.

**Effets et limites :** Ne valide pas la campagne de certification ni les providers réels.

### Recette de stream et actions

**Préconditions :** Serveur de recette, catalogue connu et scénarios d'erreur.

**Attendu :** Fragmentation, terminal, annulation, slug absent et confirmation vérifiés.

**Effets et limites :** Action confirmée doit rester limitée au contrat ; pas de clic automatisé sur une commande métier inconnue.

## Vérification fonctionnelle

1. SSE fragmenté entre JSON/lignes, CRLF et data multilignes.
2. Meta/progress/error/done, fin réseau anticipée et stop utilisateur.
3. v1/v2 face aux versions backend compatibles et erreurs HTTP.
4. Slug/image présents et absents, aucun lien inventé.
5. Confirmation avec mauvais token/instance/URL et rejeu idempotent.
6. Changement de projet et refus de permission sur configuration.
7. Test DB conservé et attente provider visible sans faux terminal.

## Interventions et chronologie

L'annexe recense 65 commits signés par Ylan/YlanDecode dans les ancêtres du commit de référence. Elle est exhaustive pour ce filtre et cette révision, pas pour les autres auteurs ni les branches non intégrées. Les merges sont des intégrations collectives, pas une attribution exclusive du code.

| Date          | Référence                   | Auteur / statut | Intervention                                               | Portée de la preuve                                             |
| ------------- | --------------------------- | --------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| 2026-08-19    | 3e2c0e9 / c5c7e2a           | YlanDecode      | Résultat test DB conservé, cartes et attentes fournisseur. | Comportements à préserver dans refonte.                         |
| 2026-09-01/04 | 34a0873 / 4d56feb / d0918cd | YlanDecode      | Images catalogue et workspace/configuration/analytics.     | Surfaces présentes ; sources réellement disponibles à recetter. |
| 2026-09-10    | c4d8ddd                     | YlanDecode      | Conservation du slug reçu.                                 | Ne pas reconstruire la valeur depuis le nom.                    |

[Annexe Git complète](HISTORIQUE_GIT.md).

## Points forts et raisons des choix

- Le parseur reconstitue les événements avant interprétation, indépendamment des chunks réseau.
- Le contrat public sépare texte et données de catalogue.
- La confirmation vérifie exactement la proposition et protège l'idempotence.
- Le workspace rassemble réglages et résultats de test sans faire du navigateur l'autorité sur les sources.

## Guide de travail pour l'assistant IA

1. Lire AGENTS.md et les docs Next installées avant code du framework.
2. Partir du client de transport puis du service/parseur et du composant ; ne pas réécrire le SSE depuis un commentaire ancien.
3. Ne pas créer slug, URL ou action pour embellir un payload incomplet.
4. Maintenir types v1/v2 et contrat serveur ensemble.
5. Ne pas assouplir les comparaisons de confirmation pour contourner un refus.
6. Conserver les états d'attente, le résultat de test DB et la distinction entre config et readiness.

## Sources et documents complémentaires

- [AGENTS.md](../../AGENTS.md) — Consigne spécifique à la génération Next.
- [lib/api/client.ts](../../lib/api/client.ts) — Fetch POST, header et parsing d'événements.
- [services/chat.service.ts](../../services/chat.service.ts) — Versions publiques, terminal et confirmation stricte.
- [services/project-database.service.ts](../../services/project-database.service.ts) — Contrat des connexions de projet.
- [services/workflow.service.ts](../../services/workflow.service.ts) — Administration du moteur.
- [types](../../types) — Objets du payload et du catalogue.
- [package.json](../../package.json) — Stack et scripts.

### Synthèses locales

- [CONTEXTE_DEPOT.md](CONTEXTE_DEPOT.md)
- [DESIGN.md](DESIGN.md)
- [ETAT_ET_REPRISE.md](ETAT_ET_REPRISE.md)
- [README.md](README.md)

## Maintenir cette passation

Modifier dossier.json pour faire évoluer le fond de cette passation, puis générer les fichiers dérivés avec l'outil local et Python 3.10 ou plus récent. Actualiser les références et les preuves lorsqu'un contrat change. Le snapshot historique est figé à la révision annoncée ; --refresh-history le reconstruit depuis cette révision. --check contrôle sans écriture. Aucune clé ni donnée métier privée n'est nécessaire au rendu.

```text
python -B docs/passation/generer_passation.py
python -B docs/passation/generer_passation.py --check
```
