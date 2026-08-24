export const VERSION_LABEL_MAX_LENGTH = 64;

export function normalizeVersionLabel(value: string) {
  return value.trim().slice(0, VERSION_LABEL_MAX_LENGTH);
}

export function isValidVersionLabel(value: string) {
  return value.length > 0
    && value.length <= VERSION_LABEL_MAX_LENGTH
    && /^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(value);
}

export function inferVersionLabelFromFilename(filename: string) {
  const basename = filename.replace(/\.[^.]+$/, '');
  const match = basename.match(/(?:^|[-_.\s])(v?\d+(?:\.\d+)+(?:[-+][0-9A-Za-z.-]+)?)(?:$|[-_.\s])/i);
  return match?.[1] || null;
}

export function inferVersionLabelFromHtml(html: string) {
  const meta = html.match(/<meta\s+[^>]*(?:name=["'](?:app-)?version["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*name=["'](?:app-)?version["'])[^>]*>/i);
  const candidate = normalizeVersionLabel(meta?.[1] || meta?.[2] || '');
  return candidate && isValidVersionLabel(candidate) ? candidate : null;
}

export function displayVersionLabel(version: { number: number; label?: string | null }) {
  return version.label || String(version.number);
}
