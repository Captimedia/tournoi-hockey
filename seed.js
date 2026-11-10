// Donnees de depart reprises du Google Sheet (onglet Equipes) ; les images sont dans graphiques/ (copie reduite de l'ancien depot overlay).
import { graphiques } from "./config.js?v=5b8af9a8";

const LOGOS = `${graphiques.base}logos/`;
const SPONSORS_URL = `${graphiques.base}commanditaires/`;

export const TEAMS = [
  ["BULLDOGS", "#BC0B0B", "#DADADA", "Bulldogs.png"],
  ["GLADIATEURS", "#444444", "#DADADA", "Gladiateurs.png"],
  ["L'ESCOUADE DES ILES", "#333333", "#DADADA", "Escouade.png"],
  ["MARINS", "#142167", "#DADADA", "Marins.png"],
  ["PRÉDATEURS", "#1A2551", "#DADADA", "Predateurs.png"],
  ["CAYENS", "#223BA7", "#FFFFFF", "Cayens.png"],
  ["CONQUÉRANTS", "#444444", "#FFFFFF", "Conquerants.png"],
  ["FLAMES", "#DD5A03", "#444444", "flames.png"],
  ["GUERRIERS", "#BA1C1C", "#DADADA", "Gladiateurs_bdc.png"],
].map(([nom, primary, secondary, f]) => ({ nom, primary, secondary, logo: LOGOS + f }));

export const SPONSORS = [
  "Alban_Aspirault.png", "Alexis_Deschenes.png", "Bouchees-a-table.png", "Breuvages-Gaspe.png",
  "CTMA_Logo.png", "Canadian-Tire.png", "Depute-Stephane-Ste-Croix.png", "Desjardins.png",
  "Excavation-Dube-Cassivi.png", "Ford.png", "GD-Construction.png", "HG-Division.png",
  "Hockey-est-du-quebec.png", "Hotel-Plante.png", "Motel_Fraser.png", "O'Dwyer.jpg",
  "Pecheries-Maxime-Lelievre.png", "Pecheries-Valere.png", "Petits-plats-de-Lilo.png",
  "Promo-AD.png", "UPA.png", "Ville-de-Gaspe.png", "familiprix.png", "innergex.png",
  "logo-FRASER.png", "pecheries-Mitch-Girard.png", "resto-bar-le-relais.png", "tim-hortons.png",
].map((f) => ({ nom: f.replace(/\.\w+$/, "").replace(/[-_]/g, " "), logo: SPONSORS_URL + encodeURIComponent(f) }));
