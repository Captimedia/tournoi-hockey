// Acces a GitHub depuis le navigateur : liste des images du dossier graphiques/ (lecture publique, sans jeton)
// et envoi d'un logo (avec le jeton de l'utilisateur, jamais ecrit dans un message ni dans le code).
import { graphiques } from "./config.js?v=029af5bd";
import { contentsPut, contentsDelete, githubError } from "./logic.js?v=029af5bd";

const KEY = "tournoi-galerie";
const TTL = 10 * 60 * 1000; // l'API publique limite a 60 lectures par heure et par adresse internet : on garde la liste 10 minutes

const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; } };
const write = (tree) => { try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), tree })); } catch { /* stockage indisponible : on continue sans */ } };

export async function loadTree(force = false) {
  const c = read();
  if (!force && c && Date.now() - c.t < TTL) return c.tree;
  const r = await fetch(`https://api.github.com/repos/${graphiques.owner}/${graphiques.repo}/git/trees/${graphiques.branch}?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } });
  if (r.status === 403) throw new Error("GitHub limite les lectures (60 par heure par connexion internet). Réessaie dans quelques minutes.");
  if (!r.ok) throw new Error(`Lecture de la galerie impossible (${r.status}).`);
  const tree = (await r.json()).tree.filter((x) => x.path.startsWith(`${graphiques.dossier}/`)).map(({ path, type, sha }) => ({ path, type, sha }));
  write(tree);
  return tree;
}

// Apres un envoi : l'image apparait tout de suite dans la galerie (sa page publique suit dans environ une minute).
export function addToCache(path) {
  const c = read();
  if (c) write([...c.tree, { path, type: "blob" }]);
}

// Supprime une image du depot (avec son sha) et la retire de la liste gardee en memoire.
export async function deleteImage(token, path, sha) {
  const { url, body } = contentsDelete(graphiques, path, sha);
  const r = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status !== 200) throw new Error(githubError(r.status));
  const c = read();
  if (c) write(c.tree.filter((x) => x.path !== path));
}

// Cree un NOUVEAU fichier (jamais de remplacement : pas de "sha"). Retourne son adresse publique.
export async function publishImage(token, folder, name, base64) {
  const { url, body } = contentsPut(graphiques, folder, name, base64);
  const r = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status !== 201) throw new Error(githubError(r.status));
  return `${graphiques.base}${folder}/${encodeURIComponent(name)}`;
}

// Le jeton peut-il ecrire dans le depot ? (true / false ; une Error lisible si GitHub le refuse)
export async function testToken(token) {
  const r = await fetch(`https://api.github.com/repos/${graphiques.owner}/${graphiques.repo}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(githubError(r.status));
  return (await r.json()).permissions?.push === true;
}
