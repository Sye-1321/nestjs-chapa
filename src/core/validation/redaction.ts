const sensitiveKeys = /authorization|secret|signature|token|password|email|phone|account|first.?name|last.?name|body|checkout.?url/i;

export function redactSensitive(value: unknown, knownSecrets: readonly string[] = []): unknown {
  if (typeof value === 'string') {
    const containsKnownSecret = knownSecrets.some((secret) => secret.length > 0 && value.includes(secret));
    const resemblesSensitiveData = /bearer\s+\S+|\b(?:secret|signature|token|password)\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){7,}/i.test(value);
    return containsKnownSecret || resemblesSensitiveData ? '[REDACTED]' : value;
  }
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, knownSecrets));
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      result[key] = sensitiveKeys.test(key) ? '[REDACTED]' : redactSensitive(item, knownSecrets);
    }
    return result;
  }
  return value;
}

export function safeCause(cause: unknown): { readonly name: string } | undefined {
  return cause instanceof Error ? { name: cause.name || 'Error' } : undefined;
}
