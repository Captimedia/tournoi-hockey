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

## Tournois et bibliothèques

- Chaque **tournoi** a ses propres équipes, commanditaires, matchs, notes et état de glaces. Le sélecteur en haut choisit le tournoi qu'on modifie ; **★ Définir comme actif** choisit celui que les overlays affichent (les URL d'overlay ne changent donc jamais).
- L'**import crée les équipes dans le tournoi** (« Nouveau tournoi » ou le tournoi sélectionné) : rien n'est associé automatiquement à une équipe d'un autre tournoi, donc les Prédateurs régional et local restent séparés.
- Deux **bibliothèques** communes (onglet Bibliothèque) : équipes et commanditaires. Dans les onglets Équipes et Commanditaires d'un tournoi, chaque élément affiche son état (« ✔ Associée à … » ou « Non associée »). **Choisir dans la bibliothèque…** ouvre une liste avec logos et recherche (les noms identiques d'abord, avec « même nom ») : **Utiliser** copie logo, couleurs et nom complet (le nom court du tournoi ne change pas). C'est une copie : modifier la bibliothèque plus tard ne change pas les anciens tournois ; pour reprendre une version à jour, on rechoisit la même équipe. **Enregistrer dans la bibliothèque** fait l'inverse (tournoi vers bibliothèque). **Dissocier** retire le lien sans rien effacer. « Associer les N équipes qui ont le même nom » propose le tout d'un coup, avec confirmation.
- L'onglet **Tournois** liste tous les tournois : renommer, ouvrir, définir comme actif, supprimer (équipes, commanditaires, matchs et notes ; pas les bibliothèques).
- **Sélection multiple** (cases + « Tout sélectionner ») pour supprimer des matchs (onglet Horaire), des équipes ou des commanditaires. Chaque suppression propose **Annuler** pendant 15 secondes (rétablit aussi les notes et le match affiché en direct). Le ✕ d'une équipe prévient si des matchs l'utilisent.
- **Nettoyage** : « Fusionner les doublons » (équipes de même nom : on garde la plus complète, les matchs sont rebranchés) et « Supprimer les matchs en double » (même numéro : on garde celui qui a des pointages, un commanditaire ou qui est en direct).
- Structure : `public/tournois/{id}` (fiche), `public/liste/{id}` (index pour le sélecteur), `public/actif`, `public/lib/teams`, `public/lib/sponsors`, `prive/{id}/{matchId}` (caméraman, note). Le dashboard ne lit que les bibliothèques, l'index et le tournoi sélectionné.
- Anciennes données (avant les tournois) : un bandeau propose de ranger les équipes et commanditaires dans les bibliothèques.
- La sauvegarde télécharge tout (tournois, bibliothèques, notes privées).

## Une page par glace

Les onglets **Glace 1** et **Glace 2** reprennent l'ancienne page `glace1.html` : match en cours et prochain match côte à côte (logos, pointages avec − / + ou saisie, couleurs Pri / Sec, commanditaire), Valider / Précédent / Suivant, puis l'horaire de la glace avec filtres et boutons « En cours » / « Prochain » par ligne.

Liens directs (à mettre en favori ou sur un Stream Deck) : `index.html?glace=1` et `index.html?glace=2`.

## Équipes : nom court et nom complet

Chaque équipe a un **nom court** (celui de l'horaire, de l'overlay et de Scorebird, ex. `Express`) et un **nom complet** facultatif (ex. `Express de Mont-Joli`). Les deux sont modifiables dans l'onglet Équipes, et l'import reconnaît l'un ou l'autre : un horaire qui écrit `Express de Mont-Joli` retrouve l'équipe `Express`. Le nom complet s'affiche en info-bulle sur la page de la glace.

**Découverte automatique à l'import** : si le fichier contient aussi une liste de noms complets (ex. `Express de Mont-Joli` à côté de l'horaire qui écrit `Express`), l'aperçu les associe tout seul et l'équipe est créée avec les deux noms. Règles : la cellule doit commencer par le nom court suivi d'un espace ou d'un tiret, ne pas être elle-même une équipe de l'horaire, et être la seule candidate (s'il y en a plusieurs, rien n'est deviné et l'aperçu le signale). Une équipe existante sans nom complet l'apprend aussi, et un nom du fichier que tu associes à la main à une équipe existante est retenu comme son nom complet (jamais écrasé s'il existe déjà).

Dans les onglets Équipes et Commanditaires, on peut **cocher plusieurs lignes** (ou « Tout sélectionner ») puis **Supprimer la sélection**. Le dashboard prévient si des matchs utilisent encore ces équipes. Télécharger une sauvegarde avant.

## Importer un horaire

**Réimporter pour réparer** : dans un tournoi qui a déjà des matchs, l'aperçu propose **Synchroniser** (par défaut) ou **Ignorer** les matchs de même numéro. Synchroniser ne double rien : il corrige date, heure, lieu, division et ronde, **recrée une équipe supprimée par erreur** et rebranche ses matchs, et résout les « Gagnant #… » que le fichier connaît. Il ne touche jamais aux pointages, commanditaires, couleurs ni notes, et ne remplace jamais une équipe valide (il la signale). L'aperçu chiffre ce qui sera fait avant d'enregistrer ; un deuxième passage ne change plus rien.

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

Le dashboard a des boutons « Copier URL » pour chacun. L'overlay suit le tournoi actif ; `&tournoi=ID` fixe un tournoi précis.

## Données

- `public/` : lisible par les overlays (glaces, matchs, équipes, commanditaires). Écriture réservée à ton UID.
- `prive/` : caméramans et notes. Lecture et écriture réservées à ton UID.

Les logos choisis depuis le dashboard sont réduits à 200 px et gardés dans la base. Un logo peut aussi être une URL.

## Test

`node test.mjs` : logique d'ordre des matchs, Valider, et construction de l'URL Scorebird.
