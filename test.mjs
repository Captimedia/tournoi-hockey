import assert from "node:assert/strict";
import { sortMatches, neighbor, following, statut, scorebirdUrl } from "./logic.js";

const matches = {
  b: { num: 2, glace: 1, date: "2027-04-01", heure: "16:45" },
  a: { num: 1, glace: 1, date: "2027-04-01", heure: "15:15" },
  c: { num: 3, glace: 2, date: "2027-04-01", heure: "15:15" },
  d: { num: 4, glace: 1, date: "2027-04-02", heure: "08:00" },
};
const list = sortMatches(matches, 1);
assert.deepEqual(list.map((m) => m.id), ["a", "b", "d"]);
assert.deepEqual(sortMatches(undefined, 1), []);

assert.equal(neighbor(list, "a", 1), "b");
assert.equal(neighbor(list, "a", -1), "a"); // reste au debut
assert.equal(neighbor(list, "d", 1), "d"); // reste a la fin
assert.equal(neighbor(list, null, 1), "a");
assert.equal(neighbor(list, null, -1), "d");
assert.equal(neighbor([], null, 1), null);

assert.equal(following(list, "b"), "d");
assert.equal(following(list, "d"), null);

assert.equal(statut(list, "b", "b"), "Live");
assert.equal(statut(list, "b", "a"), "Complété");
assert.equal(statut(list, "b", "d"), "À venir");
assert.equal(statut(list, undefined, "a"), "À venir");

// Meme URL que celle du Google Sheet pour le match #1 (onglet Matchs).
const teams = {
  esc: { nom: "L'ESCOUADE DES ILES", primary: "#333333", secondary: "#DADADA", logo: "https://captimedia.github.io/overlay/logos/Escouade.png" },
  pre: { nom: "PRÉDATEURS", primary: "#1A2551", secondary: "#DADADA", logo: "https://captimedia.github.io/overlay/logos/Predateurs.png" },
};
const expected =
  "https://widget.scorebird.com/broadcast-overlay.html?serial=21159&default_sport=ice%20hockey&home_name=L'ESCOUADE%20DES%20ILES&away_name=PR%C3%89DATEURS&home_team_color=%23333333&away_team_color=%231A2551&animate=true&home_team_logo=https%3A%2F%2Fcaptimedia.github.io%2Foverlay%2Flogos%2FEscouade.png&away_team_logo=https%3A%2F%2Fcaptimedia.github.io%2Foverlay%2Flogos%2FPredateurs.png";
assert.equal(scorebirdUrl("21159", { home: "esc", away: "pre", homeMode: "Primary", awayMode: "Primary" }, teams), expected);

// Un logo en data URL est omis, pas transmis.
const withData = { ...teams, esc: { ...teams.esc, logo: "data:image/png;base64,AAAA" } };
assert.ok(!scorebirdUrl("21159", { home: "esc", away: "pre" }, withData).includes("home_team_logo"));

/* ---------- Import d'horaire ---------- */
import { parseDate, parseTime, placeholder, parseSchedule, uniqueTeams, teamIndex, buildUpdate, normName, sideName } from "./logic.js";

assert.equal(parseDate("46100", 2030), "2026-03-19"); // numero de serie Excel
assert.equal(parseDate("2026-03-19"), "2026-03-19");
assert.equal(parseDate("19/03/2026"), "2026-03-19");
assert.equal(parseDate("jeudi 19 mars", 2027), "2027-03-19");
assert.equal(parseDate("1er avril 2026"), "2026-04-01");
assert.equal(parseDate("30 février 2026"), null); // date impossible
assert.equal(parseDate("n'importe quoi"), null);

assert.equal(parseTime("8h00"), "08:00");
assert.equal(parseTime("15h15"), "15:15");
assert.equal(parseTime("8h"), "08:00");
assert.equal(parseTime("21:30"), "21:30");
assert.equal(parseTime("0.5"), "12:00");
assert.equal(parseTime("25h00"), null);

assert.equal(placeholder("PERDANT #22"), "PERDANT #22");
assert.equal(placeholder("gagnant 53"), "GAGNANT #53");
assert.equal(placeholder("3E POSITION"), "3E POSITION");
assert.equal(placeholder("1ÈRE POSITION"), "1ÈRE POSITION");
assert.equal(placeholder("ÉQUIPE A 1 VILLE"), null);

assert.equal(normName("  L’Équipe  des Îles "), "L'EQUIPE DES ILES");

const tsv = (rows) => rows.map((r) => r.join("\t")).join("\n");
const sample = tsv([
  ["", "TOURNOI TEST"],
  ["", "NO.", "DATE", "HEURE", "LIEU", "DIVISION", "VISITEUR", "", "VS", "LOCAL"],
  ["", "", "JEUDI", "", "", "", "", "", "", "POINTAGE"],
  ["", "1", "46100", "8h00", "Arena Nord", "M11", "ÉQUIPE A 1 VILLE", "", "vs", "L'ÉQUIPE B PORT"],
  ["", "2", "46100", "8h00", "Arena Sud", "M11", "Équipe a 1  ville", "", "vs", "ÉQUIPE A 2 VILLE"],
  ["", "", "45737", "18h30", "", "OUVERTURE OFFICIELLE"],
  ["", "", "VENDREDI"],
  ["", "3", "46101", "9h10", "Arena Nord", "M13", "PERDANT #1", "", "vs", "GAGNANT 2"],
  ["", "3", "46101", "9h10", "Arena Nord", "M13", "X", "", "vs", "Y"],
  ["", "4", "46101", "10h20", "Arena Sud", "M13", "3E POSITION", "", "vs", "1ÈRE POSITION"],
]);
const parsed = parseSchedule(sample, 2026);
assert.equal(parsed.error, undefined);
assert.equal(parsed.matches.length, 4);
assert.deepEqual(parsed.matches[0], { num: 1, date: "2026-03-19", heure: "08:00", lieu: "Arena Nord", division: "M11", away: { nom: "ÉQUIPE A 1 VILLE" }, home: { nom: "L'ÉQUIPE B PORT" } });
assert.deepEqual(parsed.matches[2].away, { ref: "PERDANT #1" });
assert.deepEqual(parsed.matches[2].home, { ref: "GAGNANT #2" });
assert.deepEqual(parsed.matches[3].home, { ref: "1ÈRE POSITION" });
// Les titres de jour sont ignores en silence ; l'evenement et le doublon sont signales.
assert.deepEqual(parsed.skipped.map((s) => s.reason), ["pas un match reconnu", "numéro en double"]);

assert.match(parseSchedule("rien", 2026).error, /titres/);
assert.match(parseSchedule("DATE\tHEURE\tVISITEUR\tLOCAL", 2026).error, /num/);

// Memes equipes ecrites differemment = une seule equipe ; numeros 1/2/3 = equipes distinctes.
const uniq = uniqueTeams(parsed.matches);
assert.deepEqual(uniq.map((t) => t.nom), ["ÉQUIPE A 1 VILLE", "L'ÉQUIPE B PORT", "ÉQUIPE A 2 VILLE"]);

// Equipe deja en base : reutilisee (meme sans accents) ; les autres sont creees une seule fois.
let n = 0;
const newId = () => `id${++n}`;
const existing = { t1: { nom: "EQUIPE A 1 VILLE" } };
const idx = teamIndex(existing);
const upd = buildUpdate(parsed.matches, { "Arena Nord": 1, "Arena Sud": 2 }, new Map(uniq.map((t) => [t.key, idx.get(t.key) ?? null])), newId);
const created = Object.keys(upd).filter((k) => k.startsWith("teams/"));
assert.equal(created.length, 2);
assert.deepEqual(Object.values(upd).filter((v) => v.nom).map((v) => v.nom), ["L'ÉQUIPE B PORT", "ÉQUIPE A 2 VILLE"]);
const recs = Object.entries(upd).filter(([k]) => k.startsWith("matches/")).map(([, v]) => v);
assert.equal(recs.length, 4);
assert.equal(recs[0].away, "t1");
assert.equal(recs[1].away, "t1"); // meme equipe, autre graphie
assert.equal(recs[0].glace, 1);
assert.equal(recs[1].glace, 2);
assert.equal(recs[2].awayRef, "PERDANT #1");
assert.equal(recs[2].away, undefined);
assert.equal(sideName(recs[2], "away", {}), "PERDANT #1");
assert.equal(sideName({ away: "t1" }, "away", existing), "EQUIPE A 1 VILLE");

console.log("tous les tests passent");
