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

/* ---------- Nom complet decouvert dans le fichier ---------- */
import { pairFullNames } from "./logic.js";
const cells = ["Pool 1", "Express de Mont-Joli", "Viking du Rocher", "Prédateurs de Forillon", "Prédateurs de Gaspé", "Flyers-de-Saint-Fabien", "Notes :"];
const pf = pairFullNames(["Express", "Viking", "Prédateurs", "Flyers", "Conquérants"], cells);
assert.equal(pf.full.get("EXPRESS"), "Express de Mont-Joli");
assert.equal(pf.full.get("VIKING"), "Viking du Rocher");
assert.equal(pf.full.get("FLYERS"), "Flyers-de-Saint-Fabien"); // tiret accepte
assert.equal(pf.full.has("CONQUERANTS"), false); // aucun candidat : rien d'invente
assert.equal(pf.full.has("PREDATEURS"), false); // deux candidats : on ne devine pas
assert.deepEqual(pf.ambiguous.get("PREDATEURS"), ["Prédateurs de Forillon", "Prédateurs de Gaspé"]);
// Un nom qui est deja une equipe de l'horaire n'est jamais pris pour un nom complet.
assert.equal(pairFullNames(["Prédateurs", "Prédateurs Forillon"], ["Prédateurs Forillon"]).full.size, 0);
// Les cellules du fichier sont remontees par parseSchedule (hors dates, heures et matchs a venir).
const withRoster = parseSchedule(tsv([
  ["Vendredi 23 janvier", "", "", "", "", "Pool 1"],
  ["Express", "vs", "Viking", "16h", "POOL 1", "Express de Mont-Joli", "Viking du Rocher"],
  ["3e pool 1", "vs", "Gagnant QF1", "17h", "QF1"],
]), 2026);
assert.ok(withRoster.cells.includes("Express de Mont-Joli"));
assert.ok(!withRoster.cells.includes("Vendredi 23 janvier") && !withRoster.cells.includes("3e pool 1") && !withRoster.cells.includes("16h"));

// Creation : le nom complet est enregistre avec l'equipe.
let q = 0;
const mk = () => `n${++q}`;
const mt = withRoster.matches.slice(0, 1);
const pr = pairFullNames(uniqueTeams(mt).map((t) => t.nom), withRoster.cells);
const fresh = buildUpdate(mt, {}, new Map(), mk, { fullNames: pr.full });
const express = Object.values(fresh).find((v) => v.nom === "Express");
assert.equal(express.complet, "Express de Mont-Joli");
// Equipe existante sans nom complet : elle l'apprend ; avec un nom complet : jamais ecrasee.
const known = { t1: { nom: "EXPRESS" }, t2: { nom: "VIKING", complet: "Viking officiel" } };
const learnt = buildUpdate(mt, {}, new Map([["EXPRESS", "t1"], ["VIKING", "t2"]]), mk, { teams: known, fullNames: pr.full });
assert.equal(learnt["teams/t1/complet"], "Express de Mont-Joli");
assert.equal(learnt["teams/t2/complet"], undefined);
// Un nom du fichier associe a la main a une autre equipe est retenu comme nom complet.
const alias = buildUpdate([{ num: 1, date: "2026-04-01", heure: "15:15", lieu: "", division: "", away: { nom: "L'ESCOUADE DES ILES - CHAMPIONNAT" }, home: { nom: "X" } }], {},
  new Map([["L'ESCOUADE DES ILES - CHAMPIONNAT", "t9"]]), mk, { teams: { t9: { nom: "L'ESCOUADE DES ILES" } } });
assert.equal(alias["teams/t9/complet"], "L'ESCOUADE DES ILES - CHAMPIONNAT");
// Meme nom (accents ou majuscules pres) : rien a apprendre.
const same = buildUpdate(mt, {}, new Map([["EXPRESS", "t1"]]), mk, { teams: { t1: { nom: "Express" } } });
assert.equal(same["teams/t1/complet"], undefined);

/* ---------- Tournois et bibliotheques ---------- */
import { fromLib, toLib, libCandidates, prefixKeys, newTournament, hasLegacy, hasLegacyMatches, legacyMove } from "./logic.js";

const lb = { g1: { nom: "PRÉDATEURS", complet: "Prédateurs de Forillon", logo: "L1", primary: "#111111", secondary: "#eeeeee" },
  g2: { nom: "PRÉDATEURS (local)", logo: "L2" }, g3: { nom: "EXPRESS", complet: "Express de Mont-Joli" } };
// Association : logo, couleurs et nom complet sont copies ; le nom court du tournoi n'est pas touche.
assert.deepEqual(fromLib(lb.g1), { logo: "L1", primary: "#111111", secondary: "#eeeeee", complet: "Prédateurs de Forillon" });
assert.deepEqual(fromLib(lb.g2), { logo: "L2" }); // les champs absents ne sont pas copies (rien n'est efface)
assert.deepEqual(fromLib(undefined), {});
assert.deepEqual(toLib({ nom: "X", logo: "L", complet: "", lib: "g1", extra: 1 }), { nom: "X", logo: "L" }); // ni lien ni champs inconnus
// Suggestions : meme nom (accents et majuscules ignores), court ou complet.
assert.deepEqual(libCandidates({ nom: "Prédateurs" }, lb), ["g1"]);
assert.deepEqual(libCandidates({ nom: "x", complet: "express de mont-joli" }, lb), ["g3"]);
assert.deepEqual(libCandidates({ nom: "Prédateurs de Forillon" }, lb), ["g1"]); // via le nom complet
assert.deepEqual(libCandidates({ nom: "Inconnu" }, lb), []);
assert.deepEqual(libCandidates({ nom: "A" }, undefined), []);
// Plusieurs versions du meme nom : toutes proposees, l'utilisateur choisit.
assert.deepEqual(libCandidates({ nom: "Prédateurs" }, { a: { nom: "PREDATEURS" }, b: { nom: "Prédateurs" } }), ["a", "b"]);

assert.deepEqual(prefixKeys({ "teams/a": { nom: "A" }, "matches/m": 1 }, "public/tournois/T"), { "public/tournois/T/teams/a": { nom: "A" }, "public/tournois/T/matches/m": 1 });
assert.deepEqual(newTournament("T", "Coupe", 5), { "public/tournois/T/nom": "Coupe", "public/tournois/T/cree": 5, "public/liste/T": { nom: "Coupe", cree: 5 } });

// Ancienne structure : equipes et commanditaires vers les bibliotheques, anciens noeuds effaces.
const old = { teams: { a: { nom: "A" }, b: { nom: "B" } }, sponsors: { s: { nom: "S" } }, glaces: { 1: { live: "x" } } };
assert.equal(hasLegacy(old), true);
assert.equal(hasLegacy({ lib: {}, tournois: {} }), false);
assert.equal(hasLegacyMatches(old), false);
assert.equal(hasLegacyMatches({ matches: { m: {} } }), true);
assert.deepEqual(legacyMove(old, { teams: { a: { nom: "DEJA" } } }), {
  "public/lib/teams/b": { nom: "B" }, // "a" existe deja dans la bibliotheque : pas ecrase
  "public/lib/sponsors/s": { nom: "S" },
  "public/teams": null, "public/sponsors": null, "public/glaces": null,
});
assert.deepEqual(legacyMove({}, {}), {});

/* ---------- Synchronisation, doublons, suppression ---------- */
import { buildSync, duplicateTeams, mergeTeams, duplicateMatches, deleteMatches, restoreMatches } from "./logic.js";

let sq = 0;
const nid = () => `n${++sq}`;
const F = (num, away, home, extra = {}) => ({ num, date: "2026-01-23", heure: "16:00", lieu: "", division: "",
  away: away.startsWith("@") ? { ref: away.slice(1) } : { nom: away }, home: home.startsWith("@") ? { ref: home.slice(1) } : { nom: home }, ...extra });
// Tournoi : l'equipe B a ete supprimee par erreur (m1 et m2 pointent vers "b", qui n'existe plus).
const tt = { a: { nom: "A" }, c: { nom: "C" } };
const exist = {
  m1: { num: 1, date: "2026-01-23", heure: "16:00", away: "a", home: "b", awayScore: 3, sponsor: "s9", homeMode: "Secondary" },
  m2: { num: 2, date: "2026-01-23", heure: "17:00", away: "b", home: "c" },
  m3: { num: 3, date: "2026-01-23", heure: "16:00", awayRef: "GAGNANT #1", homeRef: "GAGNANT #2" },
  m4: { num: 4, date: "2026-01-23", heure: "16:00", away: "a", home: "c" },
};
const sy = buildSync(
  [F(1, "A", "B"), F(2, "B", "C", { heure: "17:30" }), F(3, "A", "@GAGNANT #2"), F(4, "A", "C"), F(5, "C", "A")],
  {}, new Map([["A", "a"], ["C", "c"]]), nid, { teams: tt, existing: exist },
);
assert.deepEqual(sy.stats, { added: 1, updated: 3, unchanged: 1, relinked: 3, conflicts: 0, ambiguous: 0, teamsCreated: 1 });
const bId = Object.entries(sy.updates).find(([k, v]) => k.startsWith("teams/") && v?.nom === "B")[0].slice(6);
assert.equal(sy.updates["matches/m1/home"], bId); // equipe recreee, match rebranche
assert.equal(sy.updates["matches/m1/homeRef"], null);
assert.equal(sy.updates["matches/m2/away"], bId); // la meme equipe pour tous les matchs
assert.equal(sy.updates["matches/m2/heure"], "17:30"); // horaire corrige
assert.equal(sy.updates["matches/m3/away"], "a"); // un match a venir resolu dans le fichier
assert.equal(sy.updates["matches/m3/awayRef"], null);
assert.equal(sy.updates["matches/m3/homeRef"], undefined); // meme texte : rien a ecrire
for (const f of ["awayScore", "sponsor", "homeMode"]) assert.equal(sy.updates[`matches/m1/${f}`], undefined); // jamais touches
assert.equal(Object.keys(sy.updates).filter((k) => k.startsWith("matches/m4")).length, 0); // match deja correct : intact
// Une equipe valide differente est signalee, pas remplacee ; des numeros en double ne sont pas devines.
const cf = buildSync([F(4, "X", "C")], {}, new Map([["X", ""], ["C", "c"]]), nid, { teams: tt, existing: exist });
assert.equal(cf.stats.conflicts, 1);
assert.equal(Object.keys(cf.updates).filter((k) => k.startsWith("matches/")).length, 0);
const am = buildSync([F(1, "A", "C")], {}, new Map([["A", "a"], ["C", "c"]]), nid, { teams: tt, existing: { x: { num: 1 }, y: { num: 1 } } });
assert.equal(am.stats.ambiguous, 1);
assert.deepEqual(am.updates, {});
// Sans "existing" : comportement d'avant (tout est ajoute).
assert.equal(buildSync([F(1, "A", "C")], {}, new Map([["A", "a"], ["C", "c"]]), nid, { teams: tt }).stats.added, 1);

// Fusion d'equipes en double.
const dupT = { x1: { nom: "Express", lib: "g" }, x2: { nom: "EXPRESS", logo: "L" }, x3: { nom: "Flyers" } };
assert.deepEqual(duplicateTeams(dupT), [["x1", "x2"]]);
const mg = mergeTeams(dupT, { m1: { away: "x2", home: "x3" }, m2: { away: "x1", home: "x2" } });
assert.deepEqual(mg.groups, [{ keep: "x1", drop: ["x2"] }]); // celle qui a un lien est gardee
assert.deepEqual(mg.updates, { "teams/x1/logo": "L", "teams/x2": null, "matches/m1/away": "x1", "matches/m2/home": "x1" });
assert.deepEqual(mergeTeams({ a: { nom: "A" } }, {}), { updates: {}, groups: [] });

// Matchs en double : on garde celui qui a des donnees ; les glaces suivent.
const dm = duplicateMatches({ a: { num: 1 }, b: { num: 1, awayScore: 2 }, c: { num: 2 }, d: { num: 2 } }, { 1: { live: "a", next: "d" } });
assert.deepEqual(dm.groups.map((g) => [g.num, g.keep, g.drop]), [[1, "a", ["b"]], [2, "d", ["c"]]]);
assert.deepEqual(dm.updates, { "matches/b": null, "matches/c": null });
const dp = duplicateMatches({ a: { num: 1 }, b: { num: 1 } }, { 1: { live: "a", next: "b" } });
assert.deepEqual(dp.updates, { "matches/b": null, "glaces/1/next": "a" });
assert.deepEqual(duplicateMatches({ a: { num: 1 }, b: { num: 2 } }, {}).groups, []);

// Suppression et annulation.
const gl = { 1: { live: "m1", next: "m2" } };
assert.deepEqual(deleteMatches(new Set(["m1"]), gl), { "matches/m1": null, "glaces/1/live": null });
assert.deepEqual(restoreMatches(new Set(["m1"]), { m1: { num: 1 } }, gl), { "matches/m1": { num: 1 }, "glaces/1/live": "m1" });

/* ---------- Galerie et envoi de logos ---------- */
import { galleryItems, galleryRank, safeFileName, keepFileName, matchLogos, retarget, contentsDelete, contentsPut, githubError } from "./logic.js";

const tree = [
  { path: "graphiques/logos/Express.png", type: "blob" }, { path: "graphiques/logos/PredateursForillon.png", type: "blob" },
  { path: "graphiques/logos/Predateurs.png", type: "blob" }, { path: "graphiques/logos/predateurs_2.png", type: "blob" },
  { path: "graphiques/logos", type: "tree" }, { path: "graphiques/logos/notes.md", type: "blob" },
  { path: "graphiques/commanditaires/O'Dwyer.jpg", type: "blob" }, { path: "README.md", type: "blob" },
];
const gl2 = galleryItems(tree, "graphiques", "logos", "https://x.test/g/");
assert.deepEqual(gl2.map((i) => i.name).sort(), ["Express.png", "Predateurs.png", "PredateursForillon.png", "predateurs_2.png"]); // images du dossier seulement
assert.equal(gl2.find((i) => i.name === "Express.png").url, "https://x.test/g/logos/Express.png");
assert.equal(galleryItems(tree, "graphiques", "commanditaires", "https://x.test/g/")[0].url, "https://x.test/g/commanditaires/O'Dwyer.jpg"); // l'apostrophe est valide dans une adresse
assert.equal(galleryItems([{ path: "graphiques/logos/Mon logo é.png", type: "blob" }], "graphiques", "logos", "b/")[0].url, "b/logos/Mon%20logo%20%C3%A9.png"); // espaces et accents encodes
assert.deepEqual(galleryItems(undefined, "graphiques", "logos", "b/"), []);
// Classement : meme nom d'abord (accents et casse ignores), puis les noms qui commencent pareil.
const rk = galleryRank(gl2, "PRÉDATEURS");
assert.equal(rk[0].name, "Predateurs.png"); // nom identique d'abord
assert.equal(rk[3].name, "Express.png"); // sans rapport : a la fin
assert.deepEqual(rk.map((i) => i.match), [true, true, true, false]);
assert.deepEqual(galleryRank(gl2, "").map((i) => i.match), [false, false, false, false]);

// Un envoi ne remplace jamais un fichier : noms ASCII, collisions sans tenir compte de la casse.
assert.equal(safeFileName("Prédateurs de Forillon", "png", []), "Predateurs-de-Forillon.png");
assert.equal(safeFileName("Predateurs", "png", ["Predateurs.png", "predateurs_2.png"]), "Predateurs-2.png");
assert.equal(safeFileName("predateurs", "png", ["Predateurs.png"]), "predateurs-2.png"); // casse differente = collision
assert.equal(safeFileName("predateurs", "png", ["Predateurs.png", "predateurs-2.png"]), "predateurs-3.png");
assert.equal(safeFileName("???", "png", []), "logo.png");
const cfg = { owner: "O", repo: "R", branch: "main", dossier: "graphiques" };
const rq = contentsPut(cfg, "logos", "O'Dwyer 1.png", "AAAA");
assert.equal(rq.url, "https://api.github.com/repos/O/R/contents/graphiques/logos/O'Dwyer%201.png");
assert.deepEqual(rq.body, { message: "logo: O'Dwyer 1.png", content: "AAAA", branch: "main" });
assert.equal("sha" in rq.body, false); // jamais de remplacement
assert.match(githubError(401), /expiré/);
assert.match(githubError(403), /Contents/);
assert.match(githubError(422), /existe déjà/);
assert.equal(githubError(500), "Erreur GitHub (500).");
for (const s of [401, 403, 404, 422, 500]) assert.equal(/github_pat|ghp_|Bearer/.test(githubError(s)), false); // jamais de jeton dans un message

/* ---------- Adresse de secours ---------- */
import { rawUrl } from "./logic.js";
const gcfg = { owner: "O", repo: "R", branch: "main", dossier: "graphiques", base: "https://o.github.io/R/graphiques/" };
assert.equal(rawUrl("https://o.github.io/R/graphiques/logos/Express-2.png", gcfg), "https://raw.githubusercontent.com/O/R/main/graphiques/logos/Express-2.png");
assert.equal(rawUrl("https://o.github.io/R/graphiques/commanditaires/O'Dwyer%201.png", gcfg), "https://raw.githubusercontent.com/O/R/main/graphiques/commanditaires/O'Dwyer%201.png");
assert.equal(rawUrl("https://captimedia.github.io/overlay/logos/X.png", gcfg), null); // ancien depot : pas de secours
assert.equal(rawUrl("data:image/png;base64,AAAA", gcfg), null);
assert.equal(rawUrl(undefined, gcfg), null);

console.log("tous les tests passent");

// Nom d'origine conserve (accents, espaces) ; .png seulement parce que l'image est reencodee ; jamais un nom pris.
assert.equal(keepFileName("Prédateurs de Forillon.png", []), "Prédateurs de Forillon.png");
assert.equal(keepFileName("photo.jpg", []), "photo.png");
assert.equal(keepFileName("Logo.png", ["logo.PNG"]), "Logo-2.png");
assert.equal(keepFileName("", []), "logo.png");
assert.equal(contentsDelete({ owner: "o", repo: "r", branch: "main" }, "graphiques/logos/A é.png", "abc").url, "https://api.github.com/repos/o/r/contents/graphiques/logos/A%20%C3%A9.png");
assert.equal(contentsDelete({ owner: "o", repo: "r", branch: "main" }, "g/a.png", "abc").body.sha, "abc");
console.log("ok keepFileName / contentsDelete");

// Logos locaux : une seule image du meme nom (accents/casse/ponctuation ignores) ; sinon rien.
const imgs = [{ name: "Express.png", url: "u/Express.png" }, { name: "Predateurs.png", url: "u/P1" }, { name: "predateurs_2.png", url: "u/P2" }, { name: "Prédateurs.jpg", url: "u/P3" }];
const ml = matchLogos({ a: { nom: "Express", logo: "data:image/png;base64,xx" }, b: { nom: "Prédateurs", logo: "" }, c: { nom: "Vikings", logo: "data:x" }, d: { nom: "Express", logo: "https://ok/x.png" }, e: { nom: "X", complet: "express" } }, imgs);
assert.deepEqual(ml, { a: "u/Express.png", e: "u/Express.png" }); // b : 2 candidats (Predateurs.png et Prédateurs.jpg) -> pas devine ; d : deja une adresse
console.log("ok matchLogos");

// Renommage d'une image : tous les logos qui pointaient vers l'ancienne adresse suivent (tournois et bibliotheques).
const rt = retarget({ t1: { teams: { a: { logo: "old" }, b: { logo: "x" } }, sponsors: { s: { logo: "old" } } }, t2: { teams: { c: { logo: "old" } } } }, { teams: { g: { logo: "old" } } }, "old", "new");
assert.deepEqual(rt, { "public/tournois/t1/teams/a/logo": "new", "public/tournois/t1/sponsors/s/logo": "new", "public/tournois/t2/teams/c/logo": "new", "public/lib/teams/g/logo": "new" });
console.log("ok retarget");
