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

const MONTHS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const isoDate = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const ok = dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  return ok ? `${y}-${pad(m)}-${pad(d)}` : null;
};

// Accepte : numero de serie Excel (46100), 2026-03-19, 19/03/2026, "jeudi 19 mars" (annee = defaultYear).
export const parseDate = (raw, defaultYear) => {
  const s = strip(raw).toLowerCase().trim();
  let m;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 864e5);
    return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return isoDate(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) return isoDate(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^(?:[a-z]+\s+)?(\d{1,2})(?:er)?\s+([a-z]+)(?:\s+(\d{4}))?$/)) && MONTHS[m[2]]) {
    return isoDate(m[3] ? +m[3] : defaultYear, MONTHS[m[2]], +m[1]);
  }
  return null;
};

// Accepte : 8h00, 15h15, 8h, 8:00, ou une fraction de journee Excel (0.5 = 12:00).
export const parseTime = (raw) => {
  const s = String(raw ?? "").toLowerCase().replace(/\s/g, "");
  let m;
  if ((m = s.match(/^(\d{1,2})[h:](\d{2})?(?::\d{2})?$/))) {
    const h = +m[1];
    const mi = +(m[2] ?? 0);
    return h < 24 && mi < 60 ? `${pad(h)}:${pad(mi)}` : null;
  }
  if (/^0?\.\d+$/.test(s)) {
    const min = Math.round(Number(s) * 1440) % 1440;
    return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  }
  return null;
};

// "GAGNANT #22", "PERDANT 53", "3E POSITION" : le match n'a pas encore ses equipes.
export const placeholder = (raw) => {
  const s = normName(raw);
  let m;
  if ((m = s.match(/^(GAGNANT|PERDANT) ?#? ?(\d+)$/))) return `${m[1]} #${m[2]}`;
  if (/^\d+(ER|ERE|E|EME) POSITION$/.test(s)) return String(raw).trim().replace(/\s+/g, " ").toUpperCase();
  return null;
};

const COLS = {
  num: ["NO", "N", "NUMERO", "#", "MATCH", "PARTIE"],
  date: ["DATE"],
  heure: ["HEURE", "TIME"],
  lieu: ["LIEU", "ARENA", "ARENAS", "GLACE", "ENDROIT", "SITE"],
  division: ["DIVISION", "CATEGORIE"],
  away: ["VISITEUR", "VISITEURS", "AWAY"],
  home: ["LOCAL", "LOCAUX", "HOME", "DOMICILE"],
};
const headerKey = (c) => normName(c).replace(/[.°]/g, "");
const side = (text) => {
  const ref = placeholder(text);
  return ref ? { ref } : { nom: text };
};

// `text` : cellules collees (colonnes separees par des tabulations). Retourne { matches, skipped, error? }.
export const parseSchedule = (text, defaultYear) => {
  const rows = String(text ?? "").split(/\r?\n/).map((l) => l.split("\t"));
  const hi = rows.findIndex((r) => {
    const k = r.map(headerKey);
    return k.includes("DATE") && k.includes("HEURE");
  });
  const fail = (error) => ({ error, matches: [], skipped: [] });
  if (hi === -1) return fail("Ligne de titres introuvable : il faut au moins les colonnes DATE et HEURE.");

  const keys = rows[hi].map(headerKey);
  const idx = Object.fromEntries(Object.entries(COLS).map(([f, names]) => [f, keys.findIndex((k) => names.includes(k))]));
  const missing = ["num", "date", "heure", "away", "home"].filter((f) => idx[f] === -1);
  if (missing.length) return fail(`Colonnes introuvables : ${missing.join(", ")}.`);

  const cell = (r, f) => (idx[f] === -1 ? "" : (r[idx[f]] ?? "").trim().replace(/\s+/g, " "));
  const matches = [];
  const skipped = [];
  const seen = new Set();
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
      if (seen.has(num)) skipped.push({ line: i + 1, raw: r.filter((c) => c.trim()).join(" | "), reason: "numéro en double" });
      else {
        seen.add(num);
        matches.push({ num: Number(num), date, heure, lieu: cell(r, "lieu"), division: cell(r, "division"), away: side(away), home: side(home) });
      }
    } else if (/^\d+$/.test(num) || date) {
      skipped.push({ line: i + 1, raw: r.filter((c) => c.trim()).join(" | "), reason: "pas un match reconnu" });
    }
  }
  return { matches, skipped };
};

// Equipes distinctes de l'horaire, telles qu'ecrites (premiere graphie rencontree).
export const uniqueTeams = (matches) => {
  const out = new Map();
  for (const m of matches) {
    for (const s of [m.away, m.home]) if (s.nom && !out.has(normName(s.nom))) out.set(normName(s.nom), s.nom);
  }
  return [...out].map(([key, nom]) => ({ key, nom }));
};

export const teamIndex = (teams) => new Map(Object.entries(teams ?? {}).map(([id, t]) => [normName(t.nom), id]));

// Construit la mise a jour multi-chemins de `public/`. teamIdByKey : cle -> id existant (ou vide = creer).
export const buildUpdate = (matches, glaceByLieu, teamIdByKey, newId) => {
  const updates = {};
  const ids = new Map(teamIdByKey);
  const idFor = (nom) => {
    const k = normName(nom);
    if (!ids.get(k)) {
      const id = newId();
      ids.set(k, id);
      updates[`teams/${id}`] = { nom, primary: "#666666", secondary: "#dadada" };
    }
    return ids.get(k);
  };
  for (const m of matches) {
    const rec = { num: m.num, glace: glaceByLieu[m.lieu] ?? 1, date: m.date, heure: m.heure };
    if (m.lieu) rec.lieu = m.lieu;
    if (m.division) rec.division = m.division;
    for (const k of ["away", "home"]) {
      if (m[k].ref) rec[`${k}Ref`] = m[k].ref;
      else rec[k] = idFor(m[k].nom);
    }
    updates[`matches/${newId()}`] = rec;
  }
  return updates;
};
