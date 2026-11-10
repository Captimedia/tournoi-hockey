// Lecture d'un fichier d'horaire (PDF, Excel, CSV, texte) dans le navigateur : rien n'est envoye a un serveur.
// Les bibliotheques sont chargees a la demande, a une version precise, avec verification d'integrite (SRI).
import { gamesFromPages, gamesToTsv } from "./pdftable.js?v=307898c9";
import { parseSchedule } from "./logic.js?v=307898c9";

const CDN = "https://cdnjs.cloudflare.com/ajax/libs";
const LIBS = {
  pdf: { url: `${CDN}/pdf.js/3.11.174/pdf.min.js`, global: "pdfjsLib", sri: "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e" },
  xlsx: { url: `${CDN}/xlsx/0.18.5/xlsx.full.min.js`, global: "XLSX", sri: "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw" },
};
const PDF_WORKER = `${CDN}/pdf.js/3.11.174/pdf.worker.min.js`;
const MAX_BYTES = 20e6;

const loadLib = (key) => {
  const { url, global, sri } = LIBS[key];
  if (window[global]) return Promise.resolve(window[global]);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.integrity = sri;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve(window[global]);
    s.onerror = () => reject(new Error("Chargement de la bibliothèque de lecture impossible (connexion internet ?)."));
    document.head.append(s);
  });
};

async function pdfToTsv(file) {
  const pdfjs = await loadLib("pdf");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    pages.push(items.filter((i) => i.str.trim()).map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5] })));
  }
  if (!pages.some((p) => p.length)) {
    throw new Error("Ce PDF ne contient pas de texte sélectionnable (scan ou image). Utilise le copier-coller ou un fichier Excel.");
  }
  const games = gamesFromPages(pages);
  if (!games.length) {
    throw new Error("Tableau d'horaire non reconnu dans ce PDF (colonnes Date, Time/Heure, Away/Visiteur, Home/Local). Utilise le copier-coller.");
  }
  return gamesToTsv(games);
}

// Excel et CSV : dates et heures restent des nombres bruts, lus ensuite par parseSchedule.
async function sheetToTsv(file, csv) {
  const X = await loadLib("xlsx");
  const wb = csv ? X.read(await file.text(), { type: "string" }) : X.read(await file.arrayBuffer(), { type: "array" });
  const tsvs = wb.SheetNames.map((name) =>
    X.utils
      .sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: "", blankrows: true })
      .map((r) => r.map((c) => String(c).replace(/[\t\r\n]+/g, " ")).join("\t"))
      .join("\n"),
  );
  const year = new Date().getFullYear();
  // Premiere feuille qui contient un horaire lisible.
  return tsvs.find((t) => parseSchedule(t, year).matches.length > 0) ?? tsvs[0] ?? "";
}

// Retourne le texte (colonnes separees par des tabulations) a analyser, ou lance une Error lisible.
export async function readScheduleFile(file) {
  if (file.size > MAX_BYTES) throw new Error("Fichier trop gros (20 Mo maximum).");
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") return pdfToTsv(file);
  if (ext === "xlsx" || ext === "xls") return sheetToTsv(file, false);
  if (ext === "csv") return sheetToTsv(file, true);
  return file.text();
}
