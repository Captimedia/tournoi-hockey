// Reconstruit les matchs d'un PDF d'horaire a partir du texte et de sa position (logique pure, testee).
// Format attendu : un tableau avec une ligne de titres (# / Date / Time ou Heure / Location / Category / Away / Score / Home),
// un match par bloc de lignes, chaque colonne a une position horizontale fixe.
import { normName } from "./logic.js?v=1deeb4dd";

const FIELDS = {
  date: ["DATE"],
  time: ["TIME", "HEURE"],
  loc: ["LOCATION", "LIEU", "ARENA", "ARENAS"],
  cat: ["CATEGORY", "CATEGORIE", "DIVISION"],
  away: ["AWAY", "VISITEUR", "VISITEURS"],
  score: ["SCORE", "POINTAGE"],
  home: ["HOME", "LOCAL", "DOMICILE"],
};
const REQUIRED = ["date", "time", "away", "home"];
const MARGIN = 4; // tolerance horizontale sous le titre d'une colonne
const HEADER_BAND = 15; // sous la ligne de titres : le "#" du titre n'est pas un numero de match
const MAX_DIST = 25; // distance verticale maximale entre un texte et le numero de son match

// items : [{ s, x, y }] pour une page. Retourne { y, xs: { champ: x } } ou null.
const findHeader = (items) => {
  const hits = items
    .map((i) => ({ ...i, f: Object.keys(FIELDS).find((k) => FIELDS[k].includes(normName(i.s))) }))
    .filter((i) => i.f);
  let best = null;
  for (const h of hits) {
    const row = hits.filter((i) => Math.abs(i.y - h.y) < MARGIN);
    const xs = Object.fromEntries(row.map((i) => [i.f, i.x]));
    if (REQUIRED.every((f) => xs[f] !== undefined) && (!best || Object.keys(xs).length > Object.keys(best.xs).length)) best = { y: h.y, xs };
  }
  return best;
};

const clean = (s) => s.replace(/\s*'\s*/g, "'").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();

const gamesIn = (items, header) => {
  const bounds = Object.entries(header.xs).sort((a, b) => a[1] - b[1]).map(([f, x]) => [f, x - MARGIN]);
  const col = (x) => bounds.filter((b) => x >= b[1]).pop()?.[0] ?? "num";
  const body = items.filter((i) => i.y < header.y - HEADER_BAND);
  const anchors = body.filter((i) => col(i.x) === "num" && /^\d+$/.test(i.s)).map((i) => ({ num: Number(i.s), y: i.y, cells: {} }));
  for (const it of body) {
    const c = col(it.x);
    if (c === "num" || !anchors.length) continue;
    const a = anchors.reduce((best, x) => (Math.abs(x.y - it.y) < Math.abs(best.y - it.y) ? x : best));
    if (Math.abs(a.y - it.y) <= MAX_DIST) (a.cells[c] ??= []).push(it);
  }
  return anchors.map((a) => {
    const g = { num: a.num };
    for (const [c, its] of Object.entries(a.cells)) {
      g[c] = clean(its.sort((u, v) => v.y - u.y || u.x - v.x).map((i) => i.s).join(" "));
    }
    return g;
  });
};

// pages : un tableau d'items par page. Une page sans ligne de titres reprend celle de la page precedente.
export const gamesFromPages = (pages) => {
  let header = null;
  const games = [];
  for (const items of pages) {
    header = findHeader(items) ?? header;
    if (header) games.push(...gamesIn(items, header));
  }
  return games;
};

const cell = (s) => String(s ?? "").replace(/[\t\r\n]+/g, " ");
const division = (cat) => cell(cat).replace(/\bMixed\b/i, "").replace(/\bU\s+(\d)/, "U$1").replace(/\s+/g, " ").trim();

// Meme format que le copier-coller : la suite passe par parseSchedule.
export const gamesToTsv = (games) =>
  [["NO", "DATE", "HEURE", "LIEU", "DIVISION", "VISITEUR", "LOCAL"], ...games.map((g) => [g.num, g.date, g.time, g.loc, division(g.cat), g.away, g.home])]
    .map((r) => r.map(cell).join("\t"))
    .join("\n");
