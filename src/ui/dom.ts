const SVG_NS = 'http://www.w3.org/2000/svg';

export type Attributes = Record<string, string | number>;

export function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Attributes = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  name: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
