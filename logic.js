// Logique pure (sans navigateur ni Firebase), testee par test.mjs.

const q = encodeURIComponent;
const pad = (n) => String(n).padStart(2, "0");

export const sortMatches = (matches, glace) =>
  Object.entries(matches ?? {})
    .map(([id, m]) => ({ id, ...m }))
    .filter((m) => String(m.glace) === String(glace))
    .sort(
      (a, b) =>
        `${a.date ?? ""}${a.heure ?? ""}`.localeCompare(`${b.date ?? ""}${b.heure ?? ""}`) ||
        (a.num ?? 0) - (b.num ?? 0),
    );

// Pour les boutons Precedent / Suivant : reste sur place aux extremites.
export const neighbor = (list, id, delta) => {
  const i = list.findIndex((m) => m.id === id);
  const j = i === -1 ? (delta > 0 ? 0 : list.length - 1) : i + delta;
  return list[j]?.id ?? id ?? null;
};

// Pour Valider : le match apres `id`, ou null s'il n'y en a plus.
export const following = (list, id) => list[list.findIndex((m) => m.id === id) + 1]?.id ?? null;

export const statut = (list, liveId, id) => {
  if (id === liveId) return "Live";
  const l = list.findIndex((m) => m.id === liveId);
  return l !== -1 && list.findIndex((m) => m.id === id) < l ? "Complété" : "À venir";
};

export const colorOf = (team, mode) =>
  (mode === "Primary" ? team?.primary : team?.secondary) || "#666666";

// Nom a afficher : l'equipe, ou le texte du match de serie ("GAGNANT #22") tant qu'elle n'est pas connue.
export const sideName = (m, key, teams) => teams?.[m[key]]?.nom ?? m[`${key}Ref`] ?? "";

// Meme format que l'URL construite par le Google Sheet. Un logo en data URL ne peut pas passer
// dans une URL : seuls les logos http(s) sont transmis a Scorebird.
export const scorebirdUrl = (serial, m, teams) => {
  const away = teams?.[m.away];
  const home = teams?.[m.home];
  const parts = [
    `serial=${q(serial)}`,
    "default_sport=ice%20hockey",
    `home_name=${q(sideName(m, "home", teams))}`,
    `away_name=${q(sideName(m, "away", teams))}`,
    `home_team_color=${q(colorOf(home, m.homeMode ?? "Primary").toUpperCase())}`,
    `away_team_color=${q(colorOf(away, m.awayMode ?? "Secondary").toUpperCase())}`,
    "animate=true",
  ];
  if (/^https?:/.test(home?.logo)) parts.push(`home_team_logo=${q(home.logo)}`);
  if (/^https?:/.test(away?.logo)) parts.push(`away_team_logo=${q(away.logo)}`);
  return `https://widget.scorebird.com/broadcast-overlay.html?${parts.join("&")}`;
};

/* ---------- Import d'un horaire colle depuis Excel / Google Sheets ---------- */

const strip = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");

// Cle de comparaison des noms : ignore majuscules, accents, apostrophes typographiques et espaces multiples.
export const normName = (s) => strip(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim().toUpperCase();

// Mois en francais et en anglais, complets ou abreges.
const MONTHS = Object.fromEntries(
  [
    [1, "janvier january jan janv"], [2, "fevrier february feb fev fevr"], [3, "mars march mar"],
    [4, "avril april apr avr"], [5, "mai may"], [6, "juin june jun"], [7, "juillet july jul juil"],
    [8, "aout august aug"], [9, "septembre september sep sept"], [10, "octobre october oct"],
    [11, "novembre november nov"], [12, "decembre december dec"],
  ].flatMap(([n, names]) => names.split(" ").map((w) => [w, n])),
);

const WEEKDAYS = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };

const isoDate = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const ok = dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  return ok ? `${y}-${pad(m)}-${pad(d)}` : null;
};

// Accepte : numero de serie Excel (46100), 2026-03-19, 19/03/2026, "jeudi 19 mars" (annee = defaultYear),
// "Apr 1, 2026".
export const parseDate = (raw, defaultYear) => {
  const s = strip(raw).toLowerCase().trim();
  let m;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 864e5);
    return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return isoDate(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) return isoDate(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/)) && MONTHS[m[1]]) return isoDate(+m[3], MONTHS[m[1]], +m[2]);
  if ((m = s.match(/^(?:([a-z]+)\s+)?(\d{1,2})(?:er)?\s+([a-z]+)(?:\s+(\d{4}))?$/)) && MONTHS[m[3]]) {
    const mo = MONTHS[m[3]];
    const d = +m[2];
    if (m[4]) return isoDate(+m[4], mo, d);
    // Sans annee, le jour de la semaine ("vendredi 23 janvier") dit laquelle des annees voisines est la bonne.
    const wd = WEEKDAYS[m[1]];
    const y = wd === undefined ? defaultYear : [defaultYear, defaultYear + 1, defaultYear - 1].find((yy) => new Date(Date.UTC(yy, mo - 1, d)).getUTCDay() === wd);
    return isoDate(y ?? defaultYear, mo, d);
  }
  return null;
};

// Accepte : 8h00, 15h15, 8h, 8:00, 3:15 PM, ou une fraction de journee Excel (0.5 = 12:00).
export const parseTime = (raw) => {
  const s = String(raw ?? "").toLowerCase().replace(/\s/g, "");
  let m;
  if ((m = s.match(/^(\d{1,2})[h:](\d{2})?(?::\d{2})?(am|pm)?$/))) {
    let h = +m[1];
    const mi = +(m[2] ?? 0);
    if (m[3]) {
      if (h < 1 || h > 12) return null;
      h = (h % 12) + (m[3] === "pm" ? 12 : 0);
    }
    return h < 24 && mi < 60 ? `${pad(h)}:${pad(mi)}` : null;
  }
  if (/^0?\.\d+$/.test(s)) {
    const min = Math.round(Number(s) * 1440) % 1440;
    return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  }
  return null;
};

// "GAGNANT #22", "PERDANT 53", "Gagnant QF1", "3E POSITION", "3e pool 1", "TBD" : le match n'a pas encore ses equipes.
export const placeholder = (raw) => {
  const s = normName(raw);
  let m;
  if (s === "TBD" || s === "A DETERMINER") return "À DÉTERMINER";
  if ((m = s.match(/^(GAGNANT|PERDANT) ?#? ?(\d+)$/))) return `${m[1]} #${m[2]}`;
  if ((m = s.match(/^(GAGNANT|PERDANT) ([A-Z]{1,4}) ?(\d+)$/))) return `${m[1]} ${m[2]}${m[3]}`;
  if (/^\d+(ER|ERE|E|EME) [A-Z0-9 ]+$/.test(s)) return String(raw).trim().replace(/\s+/g, " ").toUpperCase();
  return null;
};

const COLS = {
  num: ["NO", "N", "NUMERO", "#", "MATCH", "PARTIE"],
  date: ["DATE"],
  heure: ["HEURE", "TIME"],
  lieu: ["LIEU", "ARENA", "ARENAS", "GLACE", "ENDROIT", "SITE"],
  division: ["DIVISION", "CATEGORIE"],
  round: ["RONDE", "ROUND", "TYPE", "PHASE"],
  away: ["VISITEUR", "VISITEURS", "AWAY"],
  home: ["LOCAL", "LOCAUX", "HOME", "DOMICILE"],
};
const headerKey = (c) => normName(c).replace(/[.°]/g, "");
const side = (text) => {
  const ref = placeholder(text);
  return ref ? { ref } : { nom: text };
};

// Textes du fichier (hors dates, heures, matchs a venir) : candidats pour les noms complets d'equipes.
const textCells = (rows) => [
  ...new Set(
    rows.flat().map((c) => c.trim().replace(/\s+/g, " ")).filter(
      (c) => c.length >= 3 && c.length <= 60 && /[a-zà-ÿ]{3}/i.test(c) && !parseDate(c, 2000) && !parseTime(c) && !placeholder(c),
    ),
  ),
];

// Horaire "en texte", par journee : une ligne de titre avec la date ("Vendredi 23 janvier"), puis
// "Equipe A | vs | Equipe B | 16h | POOL 2". Pas de numero de match : numerotes dans l'ordre du fichier.
const parseVsFormat = (rows, defaultYear) => {
  let date = null;
  const matches = [];
  const skipped = [];
  rows.forEach((r, i) => {
    const cells = r.map((c) => c.trim().replace(/\s+/g, " "));
    const k = cells.findIndex((c) => ["VS", "VS."].includes(normName(c)));
    if (k === -1) {
      const first = cells.find(Boolean);
      date = (first && parseDate(first, defaultYear)) || date;
      return;
    }
    const away = cells.slice(0, k).reverse().find(Boolean);
    const rest = cells.slice(k + 1);
    const hi = rest.findIndex(Boolean);
    const home = rest[hi];
    const after = rest.slice(hi + 1);
    const ti = after.findIndex((c) => parseTime(c));
    const heure = ti === -1 ? null : parseTime(after[ti]);
    const round = ti === -1 ? "" : (after.slice(ti + 1).find(Boolean) ?? "");
    if (away && home && heure && date) {
      matches.push({ num: matches.length + 1, date, heure, lieu: "", division: "", ...(round && { round }), away: side(away), home: side(home) });
    } else {
      skipped.push({ line: i + 1, raw: cells.filter(Boolean).join(" | "), reason: date ? "pas un match reconnu" : "pas de date (ligne de jour manquante)" });
    }
  });
  return { matches, skipped };
};

// `text` : cellules collees (colonnes separees par des tabulations). Retourne { matches, skipped, error? }.
export const parseSchedule = (text, defaultYear) => {
  const rows = String(text ?? "").split(/\r?\n/).map((l) => l.split("\t"));
  const hi = rows.findIndex((r) => {
    const k = r.map(headerKey);
    return k.includes("DATE") && k.includes("HEURE");
  });
  const fail = (error) => ({ error, matches: [], skipped: [] });
  if (hi === -1) {
    const alt = parseVsFormat(rows, defaultYear);
    return alt.matches.length ? { ...alt, cells: textCells(rows) } : fail("Horaire non reconnu : il faut des colonnes DATE et HEURE, ou des lignes « Équipe A vs Équipe B » sous un titre de jour.");
  }

  const keys = rows[hi].map(headerKey);
  const idx = Object.fromEntries(Object.entries(COLS).map(([f, names]) => [f, keys.findIndex((k) => names.includes(k))]));
  const missing = ["num", "date", "heure", "away", "home"].filter((f) => idx[f] === -1);
  if (missing.length) return fail(`Colonnes introuvables : ${missing.join(", ")}.`);

  const cell = (r, f) => (idx[f] === -1 ? "" : (r[idx[f]] ?? "").trim().replace(/\s+/g, " "));
  const matches = [];
  const skipped = [];
  const seen = new Map();
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const filled = r.filter((c) => c.trim()).length;
    if (!filled) continue;
    const num = cell(r, "num");
    const date = parseDate(cell(r, "date"), defaultYear);
    const heure = parseTime(cell(r, "heure"));
    const away = cell(r, "away");
    const home = cell(r, "home");
    if (/^\d+$/.test(num) && date && heure && away && home) {
      const round = cell(r, "round");
      const match = { num: Number(num), date, heure, lieu: cell(r, "lieu"), division: cell(r, "division"), ...(round && { round }), away: side(away), home: side(home) };
      const key = JSON.stringify(match);
      if (!seen.has(num)) {
        seen.set(num, key);
        matches.push(match);
      } else if (seen.get(num) !== key) {
        // Une ligne repetee a l'identique est ignoree en silence ; un meme numero avec un contenu different est signale.
        skipped.push({ line: i + 1, raw: r.filter((c) => c.trim()).join(" | "), reason: "numéro en double" });
      }
    } else if (/^\d+$/.test(num) || date) {
      skipped.push({ line: i + 1, raw: r.filter((c) => c.trim()).join(" | "), reason: "pas un match reconnu" });
    }
  }
  return { matches, skipped, cells: textCells(rows) };
};

// Glace proposee pour chaque lieu : "Glace 2" dans le nom si present, sinon l'ordre d'apparition.
export const defaultGlaces = (lieux) =>
  Object.fromEntries(
    lieux.map((l, i) => {
      const n = Number(l.match(/glace\s*(\d)/i)?.[1]);
      return [l, n === 1 || n === 2 ? n : Math.min(i + 1, 2)];
    }),
  );

// Equipes distinctes de l'horaire, telles qu'ecrites (premiere graphie rencontree).
export const uniqueTeams = (matches) => {
  const out = new Map();
  for (const m of matches) {
    for (const s of [m.away, m.home]) if (s.nom && !out.has(normName(s.nom))) out.set(normName(s.nom), s.nom);
  }
  return [...out].map(([key, nom]) => ({ key, nom }));
};

// Nom complet d'une equipe : une cellule du fichier qui commence par son nom court suivi d'un espace
// ou d'un tiret ("Express" -> "Express de Mont-Joli") et qui n'est pas elle-meme une equipe de l'horaire.
// Un seul candidat : appariement. Plusieurs : on ne devine pas (ambiguous).
export const pairFullNames = (teamNoms, cells) => {
  const used = new Set(teamNoms.map(normName));
  const full = new Map();
  const ambiguous = new Map();
  for (const nom of teamNoms) {
    const k = normName(nom);
    const found = new Map(
      cells.filter((c) => { const n = normName(c); return !used.has(n) && (n.startsWith(`${k} `) || n.startsWith(`${k}-`)); }).map((c) => [normName(c), c]),
    );
    if (found.size === 1) full.set(k, [...found.values()][0]);
    else if (found.size > 1) ambiguous.set(k, [...found.values()]);
  }
  return { full, ambiguous };
};

// Nom court ou nom complet : les deux retrouvent la meme equipe (le nom court a priorite en cas de conflit).
export const teamIndex = (teams) => {
  const entries = Object.entries(teams ?? {});
  const idx = new Map(entries.map(([id, t]) => [normName(t.nom), id]));
  for (const [id, t] of entries) if (t.complet && !idx.has(normName(t.complet))) idx.set(normName(t.complet), id);
  return idx;
};

// Nombre de matchs qui utilisent l'un des ids (champs : ["away", "home"] ou ["sponsor"]).
export const matchesUsing = (matches, ids, fields) =>
  Object.values(matches ?? {}).filter((m) => fields.some((f) => ids.has(m[f]))).length;

// Construit la mise a jour multi-chemins de `public/`. teamIdByKey : cle -> id existant (ou vide = creer).
// opts.teams : equipes existantes ; opts.fullNames : cle du nom court -> nom complet trouve dans le fichier.
// Une equipe creee recoit son nom complet ; une equipe existante sans nom complet l'apprend (un nom du fichier
// associe a une equipe existante est retenu comme nom complet, jamais ecrase s'il existe deja).
// opts.existing : matchs deja dans le tournoi ({ id: match }). Un match du fichier de meme numero est SYNCHRONISE au lieu
// d'etre ajoute : date, heure, lieu, division et ronde sont mis a jour ; une equipe supprimee ou vide est recreee et rebranchee ;
// une equipe valide n'est jamais remplacee (signalee en "conflicts") ; pointages, commanditaire, couleurs et notes ne sont pas touches.
const build = (matches, glaceByLieu, teamIdByKey, newId, { teams = {}, fullNames = new Map(), existing = null } = {}) => {
  const updates = {};
  const ids = new Map(teamIdByKey);
  const learned = new Set();
  const stats = { added: 0, updated: 0, unchanged: 0, relinked: 0, conflicts: 0, ambiguous: 0, teamsCreated: 0 };
  const idFor = (nom) => {
    const k = normName(nom);
    const full = fullNames.get(k);
    if (!ids.get(k)) {
      const id = newId();
      ids.set(k, id);
      updates[`teams/${id}`] = { nom, ...(full && { complet: full }), primary: "#666666", secondary: "#dadada" };
      stats.teamsCreated++;
    } else {
      const id = ids.get(k);
      const t = teams[id];
      const alias = full ?? (t && normName(nom) !== normName(t.nom) ? nom : null);
      if (t && !t.complet && alias && normName(alias) !== normName(t.nom) && !learned.has(id)) {
        learned.add(id);
        updates[`teams/${id}/complet`] = alias;
      }
    }
    return ids.get(k);
  };
  const byNum = new Map();
  for (const [id, m] of Object.entries(existing ?? {})) byNum.set(m.num, [...(byNum.get(m.num) ?? []), id]);

  const syncOne = (id, ex, m) => {
    const set = {};
    for (const f of ["date", "heure", "lieu", "division", "round"]) if (m[f] && ex[f] !== m[f]) set[f] = m[f];
    for (const k of ["away", "home"]) {
      const s = m[k];
      const cur = ex[k];
      if (!(cur && teams[cur])) {
        if (s.ref) {
          if (ex[`${k}Ref`] !== s.ref || cur) { set[`${k}Ref`] = s.ref; if (cur) set[k] = null; stats.relinked++; }
        } else {
          set[k] = idFor(s.nom);
          set[`${k}Ref`] = null;
          stats.relinked++;
        }
      } else if (s.nom && normName(s.nom) !== normName(teams[cur].nom) && normName(s.nom) !== normName(teams[cur].complet ?? "")) {
        stats.conflicts++;
      }
    }
    for (const [f, v] of Object.entries(set)) updates[`matches/${id}/${f}`] = v;
    if (Object.keys(set).length) stats.updated++; else stats.unchanged++;
  };

  for (const m of matches) {
    const found = byNum.get(m.num);
    if (found) {
      if (found.length > 1) stats.ambiguous++; // plusieurs matchs de meme numero : a nettoyer d'abord
      else syncOne(found[0], existing[found[0]], m);
      continue;
    }
    const rec = { num: m.num, glace: glaceByLieu[m.lieu] ?? 1, date: m.date, heure: m.heure };
    if (m.lieu) rec.lieu = m.lieu;
    if (m.division) rec.division = m.division;
    if (m.round) rec.round = m.round;
    for (const k of ["away", "home"]) {
      if (m[k].ref) rec[`${k}Ref`] = m[k].ref;
      else rec[k] = idFor(m[k].nom);
    }
    updates[`matches/${newId()}`] = rec;
    stats.added++;
  }
  return { updates, stats };
};
export const buildUpdate = (...args) => build(...args).updates;
export const buildSync = build;

/* ---------- Tournois et bibliotheques ---------- */

// Element de la bibliotheque -> champs copies dans un tournoi (le nom court du tournoi reste inchange).
export const fromLib = (l) => Object.fromEntries(["logo", "primary", "secondary", "complet"].filter((k) => l?.[k]).map((k) => [k, l[k]]));

// Element d'un tournoi -> entree de bibliotheque.
export const toLib = (t) => Object.fromEntries(["nom", "complet", "logo", "primary", "secondary"].filter((k) => t?.[k]).map((k) => [k, t[k]]));

// Ids de la bibliotheque dont le nom (court ou complet) est celui de l'element du tournoi.
export const libCandidates = (item, lib) => {
  const keys = [item?.nom, item?.complet].filter(Boolean).map(normName);
  return Object.entries(lib ?? {})
    .filter(([, l]) => [l.nom, l.complet].filter(Boolean).map(normName).some((k) => keys.includes(k)))
    .map(([id]) => id);
};

// Prefixe chaque chemin d'une mise a jour multi-chemins (ex. "teams/ID" -> "public/tournois/T/teams/ID").
export const prefixKeys = (updates, base) => Object.fromEntries(Object.entries(updates).map(([k, v]) => [`${base}/${k}`, v]));

// Creation d'un tournoi : sa fiche et son entree dans l'index (liste) lu par le selecteur.
export const newTournament = (id, nom, now) => ({
  [`public/tournois/${id}/nom`]: nom,
  [`public/tournois/${id}/cree`]: now,
  [`public/liste/${id}`]: { nom, cree: now },
});

// Ancienne structure (public/teams, sponsors, matches, glaces, avant les tournois).
const LEGACY = ["teams", "sponsors", "matches", "glaces"];
export const hasLegacy = (raw) => LEGACY.some((k) => raw?.[k]);

// Range les anciennes equipes et commanditaires dans les bibliotheques (sans ecraser un id deja present)
// puis efface les quatre anciens noeuds. Les anciens matchs ne sont pas deplacables : voir hasLegacyMatches.
export const hasLegacyMatches = (raw) => Object.keys(raw?.matches ?? {}).length > 0;
export const legacyMove = (raw, lib = {}) => {
  const up = {};
  for (const key of ["teams", "sponsors"]) {
    for (const [id, v] of Object.entries(raw?.[key] ?? {})) if (!lib?.[key]?.[id]) up[`public/lib/${key}/${id}`] = v;
  }
  for (const key of LEGACY) if (raw?.[key]) up[`public/${key}`] = null;
  return up;
};

/* ---------- Nettoyage et suppression ---------- */

// Groupes d'equipes de meme nom (accents, majuscules et espaces ignores).
export const duplicateTeams = (teams) => {
  const g = new Map();
  for (const [id, t] of Object.entries(teams ?? {})) g.set(normName(t.nom), [...(g.get(normName(t.nom)) ?? []), id]);
  return [...g.values()].filter((a) => a.length > 1);
};

const richness = (t) => (t.lib ? 4 : 0) + (t.logo ? 2 : 0) + (t.complet ? 1 : 0);

// Fusion : garde l'equipe la plus complete (puis la plus ancienne), rebranche les matchs, complete ses champs vides,
// supprime les autres. Chemins relatifs au tournoi.
export const mergeTeams = (teams, matches) => {
  const updates = {};
  const groups = [];
  for (const ids of duplicateTeams(teams)) {
    const [keep, ...drop] = [...ids].sort((a, b) => richness(teams[b]) - richness(teams[a]) || a.localeCompare(b));
    groups.push({ keep, drop });
    for (const f of ["logo", "complet", "lib"]) {
      const src = drop.find((d) => teams[d][f]);
      if (!teams[keep][f] && src) updates[`teams/${keep}/${f}`] = teams[src][f];
    }
    for (const d of drop) {
      updates[`teams/${d}`] = null;
      for (const [mid, m] of Object.entries(matches ?? {})) for (const k of ["away", "home"]) if (m[k] === d) updates[`matches/${mid}/${k}`] = keep;
    }
  }
  return { updates, groups };
};

const POINTERS = ["live", "next"];

// Matchs de meme numero : garde celui qui a le plus de donnees (affiche en direct, pointages, commanditaire), puis le plus ancien.
export const duplicateMatches = (matches, glaces) => {
  const byNum = new Map();
  for (const [id, m] of Object.entries(matches ?? {})) byNum.set(m.num, [...(byNum.get(m.num) ?? []), id]);
  const pointed = new Set(Object.values(glaces ?? {}).flatMap((g) => POINTERS.map((p) => g?.[p]).filter(Boolean)));
  const score = (id) => {
    const m = matches[id];
    return (pointed.has(id) ? 8 : 0) + (m.awayScore != null ? 3 : 0) + (m.homeScore != null ? 3 : 0) + (m.sponsor ? 1 : 0) + (m.awayMode || m.homeMode ? 1 : 0);
  };
  const updates = {};
  const groups = [];
  for (const [num, ids] of byNum) {
    if (ids.length < 2 || num == null) continue;
    const [keep, ...drop] = [...ids].sort((a, b) => score(b) - score(a) || a.localeCompare(b));
    groups.push({ num, keep, drop });
    for (const d of drop) updates[`matches/${d}`] = null;
    for (const [g, v] of Object.entries(glaces ?? {})) for (const p of POINTERS) if (drop.includes(v?.[p])) updates[`glaces/${g}/${p}`] = keep;
  }
  return { updates, groups, drop: groups.flatMap((x) => x.drop) };
};

// Suppression de matchs (Set d'ids) : les glaces qui les affichaient sont videes. restoreMatches fait l'inverse (Annuler).
export const deleteMatches = (ids, glaces) => {
  const up = {};
  for (const id of ids) up[`matches/${id}`] = null;
  for (const [g, v] of Object.entries(glaces ?? {})) for (const p of POINTERS) if (ids.has(v?.[p])) up[`glaces/${g}/${p}`] = null;
  return up;
};
export const restoreMatches = (ids, matches, glaces) => {
  const up = {};
  for (const id of ids) if (matches?.[id]) up[`matches/${id}`] = matches[id];
  for (const [g, v] of Object.entries(glaces ?? {})) for (const p of POINTERS) if (ids.has(v?.[p])) up[`glaces/${g}/${p}`] = v[p];
  return up;
};
