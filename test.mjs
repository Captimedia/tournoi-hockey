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
assert.equal(parseDate("jeudi 19 mars", 2026), "2026-03-19");
// Le jour de la semaine corrige l'annee : le 19 mars est un jeudi en 2026, pas en 2027.
assert.equal(parseDate("jeudi 19 mars", 2027), "2026-03-19");
assert.equal(parseDate("vendredi 23 janvier", 2026), "2026-01-23");
assert.equal(parseDate("19 mars", 2027), "2027-03-19"); // sans jour de semaine : l'annee demandee
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

assert.match(parseSchedule("rien", 2026).error, /non reconnu/);
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

/* ---------- Formats du PDF (dates anglaises, PM/AM, TBD) ---------- */
import { defaultGlaces } from "./logic.js";
import { gamesFromPages, gamesToTsv } from "./pdftable.js";

assert.equal(parseDate("Apr 1, 2026"), "2026-04-01");
assert.equal(parseDate("December 25, 2026"), "2026-12-25");
assert.equal(parseTime("3:15 PM"), "15:15");
assert.equal(parseTime("8:00 AM"), "08:00");
assert.equal(parseTime("12:00 AM"), "00:00");
assert.equal(parseTime("12:30 PM"), "12:30");
assert.equal(parseTime("13:00 PM"), null);
assert.equal(placeholder("TBD"), "À DÉTERMINER");

// Une ligne repetee a l'identique est ignoree en silence.
const dup = tsv([["NO", "DATE", "HEURE", "VISITEUR", "LOCAL"], ["1", "2026-04-01", "8h00", "A", "B"], ["1", "2026-04-01", "8h00", "A", "B"]]);
const pd = parseSchedule(dup, 2026);
assert.equal(pd.matches.length, 1);
assert.equal(pd.skipped.length, 0);

assert.deepEqual(defaultGlaces(["Aréna (Glace 2)", "Aréna (Glace 1)"]), { "Aréna (Glace 2)": 2, "Aréna (Glace 1)": 1 });
assert.deepEqual(defaultGlaces(["Nord", "Sud"]), { Nord: 1, Sud: 2 });

// PDF : tableau avec colonnes a position fixe ; un match = 3 lignes (texte au-dessus, sur et sous le numero).
const it = (s, x, y) => ({ s, x, y });
const header = [
  it("TOURNOI TEST", 384, 1123), it("Game", 5, 1076), it("#", 5, 1062),
  it("Date", 49, 1069), it("Time", 111, 1069), it("Location", 162, 1069), it("Category", 407, 1069),
  it("Away", 459, 1069), it("Score", 635, 1069), it("Home", 671, 1069),
];
const page1 = [
  ...header,
  // match 1 : equipe locale sur 2 lignes (nom au-dessus, suite en dessous)
  it("Aréna", 162, 1038), it("Nord", 195, 1038), it("(", 230, 1038), it("Glace", 233, 1038), it("1)", 260, 1038),
  it("U", 407, 1038), it("13", 414, 1038), it("AA", 426, 1038),
  it("L", 671, 1038), it("'", 676, 1038), it("ÉQUIPE", 678, 1038), it("B", 732, 1038), it("-", 772, 1038),
  it("1", 5, 1031), it("Apr", 49, 1031), it("1, 2026", 67, 1031), it("3:15", 111, 1031), it("PM", 131, 1031),
  it("ÉQUIPE", 459, 1031), it("A", 500, 1031), it("-", 645, 1031),
  it("Ville", 162, 1024), it(",", 190, 1024), it("QC", 195, 1024), it("Mixed", 407, 1026), it("CHAMPIONNAT", 671, 1026),
];
const page2 = [
  ...header,
  // match 2 : equipes a determiner
  it("Aréna", 162, 1000), it("Nord", 195, 1000), it("(", 230, 1000), it("Glace", 233, 1000), it("1)", 260, 1000),
  it("U", 407, 1000), it("11", 414, 1000), it("BB", 424, 1000),
  it("2", 5, 993), it("Apr", 49, 993), it("2, 2026", 67, 993), it("8:00", 111, 993), it("AM", 134, 993),
  it("TBD", 459, 993), it("-", 645, 993), it("TBD", 671, 993),
  it("Mixed", 407, 988),
];
const games = gamesFromPages([page1, page2]);
assert.equal(games.length, 2);
assert.deepEqual(games[0], { num: 1, loc: "Aréna Nord ( Glace 1) Ville, QC", cat: "U 13 AA Mixed", date: "Apr 1, 2026", time: "3:15 PM", away: "ÉQUIPE A", score: "-", home: "L'ÉQUIPE B - CHAMPIONNAT" });
const fromPdf = parseSchedule(gamesToTsv(games), 2026);
assert.equal(fromPdf.error, undefined);
assert.equal(fromPdf.matches.length, 2);
assert.deepEqual(fromPdf.matches[0], { num: 1, date: "2026-04-01", heure: "15:15", lieu: "Aréna Nord ( Glace 1) Ville, QC", division: "U13 AA", away: { nom: "ÉQUIPE A" }, home: { nom: "L'ÉQUIPE B - CHAMPIONNAT" } });
assert.deepEqual(fromPdf.matches[1].away, { ref: "À DÉTERMINER" });
assert.equal(fromPdf.matches[1].division, "U11 BB");
assert.deepEqual(gamesFromPages([[it("rien", 1, 1)]]), []); // pas de titres : rien d'invente

/* ---------- Horaire "en texte" par journee (A vs B) ---------- */
assert.equal(placeholder("3e pool 1"), "3E POOL 1");
assert.equal(placeholder("1er pool 2"), "1ER POOL 2");
assert.equal(placeholder("Gagnant QF1"), "GAGNANT QF1");
assert.equal(placeholder("Gagnant DF 2"), "GAGNANT DF2");
assert.equal(placeholder("Prédateurs"), null);

const vsText = tsv([
  ["Horaire tournoi test"],
  ["Vendredi 23 janvier", "", "", "", "", "Pool 1", "Pool 2"],
  ["Partie", "", "", "Heure", "Type", "Equipe X de Ville", "Equipe Y de Port"],
  ["Ambassadeurs", "vs", "Prédateurs", "16h", "POOL 2", "Equipe Z de Mer", "Equipe W de Lac"],
  ["Express", "vs", "Flyers", "17h30", "POOL 1", "Notes :"],
  ["Samedi 24 janvier"],
  ["Partie", "", "", "Heure", "Type"],
  ["3e pool 1", "vs", "2e pool 2", "17h", "QF1"],
  ["Gagnant QF1", "vs", "Gagnant QF3", "8h", "DF1"],
  ["Sans", "vs", "Heure"],
]);
const vs = parseSchedule(vsText, 2026);
assert.equal(vs.error, undefined);
assert.equal(vs.matches.length, 4);
assert.deepEqual(vs.matches[0], { num: 1, date: "2026-01-23", heure: "16:00", lieu: "", division: "", round: "POOL 2", away: { nom: "Ambassadeurs" }, home: { nom: "Prédateurs" } });
assert.equal(vs.matches[1].heure, "17:30");
assert.equal(vs.matches[2].date, "2026-01-24"); // la date vient de la ligne de titre du jour
assert.deepEqual(vs.matches[2].away, { ref: "3E POOL 1" });
assert.deepEqual(vs.matches[3].home, { ref: "GAGNANT QF3" });
assert.equal(vs.matches[3].round, "DF1");
assert.deepEqual(vs.skipped.map((x) => x.reason), ["pas un match reconnu"]); // "Sans vs Heure" n'a pas d'heure
// Un "vs" avant toute ligne de jour : signale, rien n'est invente.
assert.equal(parseSchedule(tsv([["A", "vs", "B", "8h", "POOL 1"]]), 2026).error?.startsWith("Horaire non reconnu"), true);
// La ronde passe jusqu'a la base.
const upd2 = buildUpdate(vs.matches, {}, new Map(), (() => { let c = 0; return () => `k${++c}`; })());
assert.equal(Object.values(upd2).find((r) => r.num === 1).round, "POOL 2");

/* ---------- Nom court / nom complet, suppression multiple ---------- */
import { matchesUsing } from "./logic.js";
const eq = { a: { nom: "EXPRESS", complet: "Express de Mont-Joli" }, b: { nom: "FLYERS" }, c: { nom: "Express de Mont-Joli" } };
const eqIdx = teamIndex(eq);
assert.equal(eqIdx.get(normName("express")), "a"); // nom court
assert.equal(eqIdx.get(normName("EXPRESS DE MONT-JOLI")), "c"); // le nom court d'une autre equipe a priorite
assert.equal(teamIndex({ a: eq.a, b: eq.b }).get(normName("express de mont-joli")), "a"); // nom complet
assert.equal(teamIndex({ a: { nom: "X", complet: "" } }).has(""), false);
const mm = { 1: { away: "a", home: "b" }, 2: { away: "b", home: "c" }, 3: { sponsor: "s1" } };
assert.equal(matchesUsing(mm, new Set(["a"]), ["away", "home"]), 1);
assert.equal(matchesUsing(mm, new Set(["b"]), ["away", "home"]), 2);
assert.equal(matchesUsing(mm, new Set(["s1"]), ["sponsor"]), 1);
assert.equal(matchesUsing(undefined, new Set(["a"]), ["away"]), 0);

console.log("tous les tests passent");
