// Configuration web Firebase. Ces valeurs ne sont pas secretes (la securite est dans database.rules.json).
export const firebaseConfig = {
  apiKey: "AIzaSyAzayikvL9UxSTWXG-ZrBSWy-pqM52OH7U",
  authDomain: "capti-tournoi-hockey.firebaseapp.com",
  databaseURL: "https://capti-tournoi-hockey-default-rtdb.firebaseio.com",
  projectId: "capti-tournoi-hockey",
  appId: "1:568822573138:web:d3a59c9fe8c22bc187978b",
};

// Dossier d'images (logos, commanditaires, fonds) : lu par la galerie, publie par GitHub Pages.
export const graphiques = {
  owner: "Captimedia",
  repo: "tournoi-hockey",
  branch: "main",
  dossier: "graphiques",
  base: "https://captimedia.github.io/tournoi-hockey/graphiques/",
};
