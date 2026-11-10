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
