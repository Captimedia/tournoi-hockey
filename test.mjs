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

console.log("tous les tests passent");
