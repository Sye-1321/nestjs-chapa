function encodeScalar(value, label) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  throw new TypeError(`Form encoder: ${label} must be a string, finite number, or boolean`);
}

export function encodeForm(entries) {
  const isMap = entries instanceof Map;
  const prototype = entries !== null && typeof entries === 'object'
    ? Object.getPrototypeOf(entries)
    : undefined;
  const isPlainObject = prototype === Object.prototype || prototype === null;

  if (!isMap && !isPlainObject) {
    throw new TypeError('Form encoder: input must be a plain object or Map');
  }

  const normalized = (isMap ? [...entries.entries()] : Object.entries(entries))
    .map(([key, value]) => {
      if (typeof key !== 'string') {
        throw new TypeError('Form encoder: key must be a string');
      }
      return [key, encodeScalar(value, `value for ${key}`)];
    })
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);

  const params = new URLSearchParams();
  for (const [key, value] of normalized) params.append(key, value);
  return params.toString();
}
