# Capti Tournoi

Un seul dashboard pour gérer les tournois de hockey, et des overlays web pour H2R ou Mimo Live.
Pages statiques (GitHub Pages) + Firebase Realtime Database (forfait gratuit).

## Mise en route (une seule fois)

1. Console Firebase : créer un projet, ajouter une **Realtime Database** en mode verrouillé.
2. Authentication : activer **Google**, puis ajouter `captimedia.github.io` aux domaines autorisés.
3. Paramètres du projet : ajouter une application web, copier la config dans `config.js`.
4. Ouvrir le dashboard, se connecter avec Google. L'onglet **Sauvegarde** affiche ton UID.
5. Coller cet UID dans `database.rules.json` (à la place de `REMPLACER_PAR_TON_UID`), puis copier ce fichier dans Realtime Database > Règles > Publier.
6. Onglets **Équipes** et **Commanditaires** : « Charger les données de départ ».

Test en local : `python3 -m http.server 8080` dans ce dossier, puis http://localhost:8080 (les modules JS ne marchent pas en `file://`).

## Une page par glace

Les onglets **Glace 1** et **Glace 2** reprennent l'ancienne page `glace1.html` : match en cours et prochain match côte à côte (logos, pointages avec − / + ou saisie, couleurs Pri / Sec, commanditaire), Valider / Précédent / Suivant, puis l'horaire de la glace avec filtres et boutons « En cours » / « Prochain » par ligne.

Liens directs (à mettre en favori ou sur un Stream Deck) : `index.html?glace=1` et `index.html?glace=2`.

## Équipes : nom court et nom complet

Chaque équipe a un **nom court** (celui de l'horaire, de l'overlay et de Scorebird, ex. `Express`) et un **nom complet** facultatif (ex. `Express de Mont-Joli`). Les deux sont modifiables dans l'onglet Équipes, et l'import reconnaît l'un ou l'autre : un horaire qui écrit `Express de Mont-Joli` retrouve l'équipe `Express`. Le nom complet s'affiche en info-bulle sur la page de la glace.

Dans les onglets Équipes et Commanditaires, on peut **cocher plusieurs lignes** (ou « Tout sélectionner ») puis **Supprimer la sélection**. Le dashboard prévient si des matchs utilisent encore ces équipes. Télécharger une sauvegarde avant.

## Importer un horaire

Onglet **Importer** : choisir un **fichier PDF, Excel (.xlsx) ou CSV**, ou copier les cellules dans Excel / Google Sheets (avec la ligne de titres) et les coller, puis **Analyser**, vérifier l'aperçu, **Importer**.

- Les fichiers sont lus dans le navigateur, rien n'est envoyé. Les bibliothèques de lecture (pdf.js 3.11.174, SheetJS 0.18.5) sont chargées à la demande depuis cdnjs, avec vérification d'intégrité (SRI) ; pour changer de version, recalculer le hash dans `import-file.js`.
- PDF : il faut du texte sélectionnable (pas un scan) et un tableau avec les colonnes Date, Time/Heure, Location/Lieu, Category/Catégorie, Away/Visiteur, Score/Pointage, Home/Local. Sinon, utiliser le copier-coller.
- Excel : la première feuille qui contient un horaire lisible est utilisée.
- `.gitignore` empêche de publier par erreur des PDF, Excel ou CSV (fichiers clients).

- Colonnes reconnues par leur titre : NO, DATE, HEURE, LIEU, DIVISION, VISITEUR, LOCAL (l'ordre n'a pas d'importance, les autres colonnes sont ignorées).
- Deuxième format reconnu : un horaire « en texte » par journée, sans colonnes DATE / HEURE. Un titre de jour (`Vendredi 23 janvier`) donne la date des matchs en dessous, chaque match est `Équipe A | vs | Équipe B | 16h | POOL 2` (le type va dans la Ronde). Pas de numéros dans ce format : les matchs sont numérotés dans l'ordre du fichier.
- Sans année dans la date, le jour de la semaine choisit l'année (le 23 janvier est un vendredi en 2026).
- Matchs à venir reconnus comme texte : `GAGNANT #22`, `PERDANT #22`, `Gagnant QF1`, `3e pool 1`, `3E POSITION`, `TBD`.
- Dates acceptées : numéro Excel, `2026-03-19`, `19/03/2026`, `jeudi 19 mars` (année = champ Année).
- Les noms d'équipes sont pris tels quels : `L'ESCOUADE 1 LES ÎLES` et `L'ESCOUADE 2 LES ÎLES` sont deux équipes. Une équipe déjà en base (même nom, sans tenir compte des majuscules, accents ou espaces) est réutilisée, sinon elle est créée. L'aperçu permet de choisir une autre équipe existante pour chaque nom.
- `GAGNANT #22`, `PERDANT #22`, `3E POSITION` sont gardés comme texte : l'overlay les affiche tant que l'équipe n'est pas choisie (onglet Horaire, colonnes Visiteur et Local).
- Les matchs dont le numéro existe déjà sont ignorés (pas de doublons si on réimporte).
- **Vider l'horaire** efface matchs, caméramans et notes : télécharger une sauvegarde avant.

## Overlays

`overlay.html?glace=1&mode=live` : partie en cours, avec scores.
`overlay.html?glace=1&mode=next` : prochain match.
`overlay.html?glace=1&mode=url` : overlay Scorebird complet du match en cours (numéro Scorebird à entrer dans le dashboard).

Le dashboard a des boutons « Copier URL » pour chacun.

## Données

- `public/` : lisible par les overlays (glaces, matchs, équipes, commanditaires). Écriture réservée à ton UID.
- `prive/` : caméramans et notes. Lecture et écriture réservées à ton UID.

Les logos choisis depuis le dashboard sont réduits à 200 px et gardés dans la base. Un logo peut aussi être une URL.

## Test

`node test.mjs` : logique d'ordre des matchs, Valider, et construction de l'URL Scorebird.
