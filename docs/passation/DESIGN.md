# Style documentaire — Dataset IA — Workspace agentique, streaming et catalogue

<!-- passation-generated-v1 -->

## Périmètre

Ce système concerne uniquement la passation locale, en mode Read. Il ne remplace
pas le design produit défini à la racine de l'application. L'écran vise un
développeur lisant du code, avec consultation mobile et impression possibles.

## Typographie

Police système ; corps 16px/1.65. Titres h1 2.6rem, 2.2rem sur écran intermédiaire
et 2rem sur mobile ; h2 1.7rem puis 1.5rem ; h3 1.16rem ; h4 1rem. Introduction
1.1rem puis 1rem mobile. Navigation 0.87rem, tableaux 0.9rem, en-têtes 0.84rem,
notes/code 0.88rem, marque de dépôt 1.05rem, sous-titre 0.85rem. SVG : titre de
composant 15px, description et numéros 12px, titre de colonne 14px ; zoom disponible.
Les chemins longs peuvent se couper, les tableaux/schémas défilent dans leur cadre.

## Palette

Fond #f4f6fa, surface #ffffff, texte #172334, secondaire #4a5b70, bord #d7dee8,
accent #1a47a0, surface bleue #eaf0fc. Les dépendances externes utilisent un ton
papier ambré #f8f4eb ; les incertitudes ont un libellé, pas seulement une couleur.

## Structure et interaction

Sommaire latéral sur bureau, sommaire natif repliable et compact sur mobile.
Carte SVG avec connecteurs orthogonaux hors des boîtes non concernées, numéros
reliés à la table des échanges, ancrages vers les composants, zoom et impression.
Le schéma tient dans le cadre bureau lorsque sa largeur permet de garder les
labels lisibles ; sinon le défilement est local. Contenu présent sans réseau,
sans police distante et sans appel aux applications décrites.

## Maintenance

Le style est embarqué dans generer_passation.py ; les données sont dans dossier.json.
Vérifier 1440x1000 et 390x844, débordement, texte SVG, contraste et ancrages après
une modification de mise en page. Une vérification documentaire n'est pas une
recette métier des applications.
