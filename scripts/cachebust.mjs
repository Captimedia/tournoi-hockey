// A lancer avant chaque publication : node scripts/cachebust.mjs
// Ajoute ?v=<empreinte> a chaque import local (./x.js). GitHub Pages laisse les navigateurs garder un fichier 10 minutes :
// sans cela, une page neuve pouvait se charger avec d'anciens modules et rester vide ("Hors ligne"). L'empreinte change
// des qu'un fichier change, donc l'adresse change et le navigateur va chercher la bonne version. Idempotent.
import fs from "node:fs";
import crypto from "node:crypto";

const FILES = ["index.html", "overlay.html", "overlay-test.html", "dom.js", "logic.js", "firebase.js", "galerie.js", "import-file.js", "pdftable.js", "seed.js", "config.js"];
const IMPORT = /(from\s*)(["'])(\.\/[\w-]+\.js)(?:\?v=[0-9a-f]+)?\2/g;

const plain = FILES.map((f) => fs.readFileSync(f, "utf8").replace(IMPORT, "$1$2$3$2"));
const v = crypto.createHash("sha256").update(plain.join("\u0000")).digest("hex").slice(0, 8);
FILES.forEach((f, i) => fs.writeFileSync(f, plain[i].replace(IMPORT, `$1$2$3?v=${v}$2`)));
console.log(`version ${v}`);
