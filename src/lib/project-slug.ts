export const PROJECT_SLUG_MAX_LENGTH = 50;

export function normalizeProjectSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, PROJECT_SLUG_MAX_LENGTH)
    .replace(/-$/g, '');
}

export function isValidProjectSlug(value: string) {
  return value.length > 0
    && value.length <= PROJECT_SLUG_MAX_LENGTH
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export async function createUniqueProjectSlug(
  value: string,
  isTaken: (slug: string) => Promise<boolean>,
) {
  const base = normalizeProjectSlug(value) || `project-${Math.random().toString(36).slice(2, 8)}`;
  if (!(await isTaken(base))) return base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base.slice(0, PROJECT_SLUG_MAX_LENGTH - suffix.length - 1)}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error('Unable to generate a unique project slug');
}
