function encodeScalar(value, label) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  throw new TypeError(`Form encoder: ${label} must be a string, finite number, or boolean`);
}

export function encodeForm(entries) {
  const pairs = entries instanceof Map
    ? [...entries.entries()]
    : Object.entries(entries ?? {});

  if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
    throw new TypeError('Form encoder: input must be a plain object or Map');
  }

  return pairs
    .map(([key, value]) => [encodeScalar(key, 'key'), encodeScalar(value, `value for ${key}`)])
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}
