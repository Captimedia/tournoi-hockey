// Petit createur d'elements : le texte passe par textContent, jamais par innerHTML.
const keep = (kids) => kids.flat(Infinity).filter((x) => x != null && x !== false);

// Remplace le contenu d'un element en ignorant les valeurs vides (undefined, null, false).
export const fill = (el, ...kids) => el.replaceChildren(...keep(kids));

export const h = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...keep(kids));
  return e;
};

// Image de logo avec secours : si l'adresse publique (GitHub Pages) n'est pas encore en ligne apres un envoi,
// on essaie une fois le fichier brut du depot (disponible tout de suite). rawOf(url) -> adresse de secours ou null.
export const fallbackImg = (src, rawOf, attrs = {}) => {
  const img = h("img", { src, alt: "", ...attrs });
  img.addEventListener("error", () => {
    const alt = rawOf(src);
    if (alt && !img.dataset.raw) { img.dataset.raw = "1"; img.src = alt; }
  });
  return img;
};
