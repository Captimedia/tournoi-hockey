// Logique pure (sans navigateur ni Firebase), testee par test.mjs.

const q = encodeURIComponent;

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

// Meme format que l'URL construite par le Google Sheet. Un logo en data URL ne peut pas passer
// dans une URL : seuls les logos http(s) sont transmis a Scorebird.
export const scorebirdUrl = (serial, m, teams) => {
  const away = teams?.[m.away];
  const home = teams?.[m.home];
  const parts = [
    `serial=${q(serial)}`,
    "default_sport=ice%20hockey",
    `home_name=${q(home?.nom ?? "")}`,
    `away_name=${q(away?.nom ?? "")}`,
    `home_team_color=${q(colorOf(home, m.homeMode ?? "Primary").toUpperCase())}`,
    `away_team_color=${q(colorOf(away, m.awayMode ?? "Secondary").toUpperCase())}`,
    "animate=true",
  ];
  if (/^https?:/.test(home?.logo)) parts.push(`home_team_logo=${q(home.logo)}`);
  if (/^https?:/.test(away?.logo)) parts.push(`away_team_logo=${q(away.logo)}`);
  return `https://widget.scorebird.com/broadcast-overlay.html?${parts.join("&")}`;
};
