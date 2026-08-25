import { createHmac, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_CANDIDATE_MATRIX = Object.freeze([
  Object.freeze({ id: 'X1', headerName: 'x-chapa-signature', keySource: 'webhookConfiguredSecret', messageSource: 'exactRawBody' }),
  Object.freeze({ id: 'X2', headerName: 'x-chapa-signature', keySource: 'apiSecretKey', messageSource: 'exactRawBody' }),
  Object.freeze({ id: 'C1', headerName: 'chapa-signature', keySource: 'webhookConfiguredSecret', messageSource: 'webhookConfiguredSecretUtf8' }),
  Object.freeze({ id: 'C2', headerName: 'chapa-signature', keySource: 'apiSecretKey', messageSource: 'apiSecretKeyUtf8' })
]);

export function decodeSha256Signature(value, encoding) {
  if (typeof value !== 'string') throw new Error('Signature decoding failed: malformed value');
  if (encoding === 'hex') {
    if (!/^[A-Fa-f0-9]{64}$/.test(value)) throw new Error('Signature decoding failed: malformed hex');
    return Buffer.from(value, 'hex');
  }
  if (encoding === 'base64') {
    if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('Signature decoding failed: malformed base64');
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length !== 32 || decoded.toString('base64') !== value) {
      throw new Error('Signature decoding failed: malformed base64');
    }
    return decoded;
  }
  throw new Error('Signature decoding failed: unsupported encoding');
}

export function timingSafeSignatureMatch(expectedDigest, signatureValue, encoding) {
  if (!Buffer.isBuffer(expectedDigest) && !(expectedDigest instanceof Uint8Array)) {
    throw new Error('Signature comparison failed: expected digest must be bytes');
  }
  const expected = Buffer.from(expectedDigest);
  if (expected.length !== 32) throw new Error('Signature comparison failed: invalid digest length');
  const observed = decodeSha256Signature(signatureValue, encoding);
  if (observed.length !== expected.length) return false;
  return timingSafeEqual(expected, observed);
}

export function hmacSha256(key, messageBytes) {
  if (typeof key !== 'string') throw new Error('HMAC evaluation failed: key unavailable');
  if (!Buffer.isBuffer(messageBytes) && !(messageBytes instanceof Uint8Array)) {
    throw new Error('HMAC evaluation failed: message must be bytes');
  }
  return createHmac('sha256', Buffer.from(key, 'utf8')).update(Buffer.from(messageBytes)).digest();
}

function classifySignature(value, encoding) {
  if (value === undefined) return { signaturePresent: false, syntaxClassification: 'missing', encodingCandidate: encoding, decoded: null };
  try {
    return { signaturePresent: true, syntaxClassification: 'valid', encodingCandidate: encoding, decoded: decodeSha256Signature(value, encoding) };
  } catch {
    return { signaturePresent: true, syntaxClassification: 'malformed', encodingCandidate: encoding, decoded: null };
  }
}

export function evaluateWebhookCandidates({ rawBody, selectedHeaders = {}, secrets = {}, encoding = 'hex' }) {
  if (!Buffer.isBuffer(rawBody) && !(rawBody instanceof Uint8Array)) {
    throw new Error('Candidate evaluation failed: raw body must be bytes');
  }
  return WEBHOOK_CANDIDATE_MATRIX.map(candidate => {
    const syntax = classifySignature(selectedHeaders[candidate.headerName], encoding);
    const secret = secrets[candidate.keySource];
    if (!syntax.signaturePresent || !syntax.decoded || typeof secret !== 'string') {
      return {
        candidateId: candidate.id,
        headerName: candidate.headerName,
        signaturePresent: syntax.signaturePresent,
        syntaxClassification: syntax.syntaxClassification,
        encodingCandidate: syntax.encodingCandidate,
        match: 'not-evaluated'
      };
    }
    const message = candidate.messageSource === 'exactRawBody'
      ? Buffer.from(rawBody)
      : Buffer.from(secret, 'utf8');
    const expected = hmacSha256(secret, message);
    return {
      candidateId: candidate.id,
      headerName: candidate.headerName,
      signaturePresent: true,
      syntaxClassification: 'valid',
      encodingCandidate: encoding,
      match: timingSafeEqual(expected, syntax.decoded)
    };
  });
}

export function diagnoseRawVsReserialized(rawBody, comparison) {
  if (!Buffer.isBuffer(rawBody) && !(rawBody instanceof Uint8Array)) {
    throw new Error('Reserialization diagnostic failed: raw body must be bytes');
  }
  const original = Buffer.from(rawBody);
  let parsed;
  try {
    parsed = JSON.parse(original.toString('utf8'));
  } catch {
    return { parseSucceeded: false, bytesIdentical: false, originalLength: original.length, reserializedLength: null };
  }
  const reserialized = Buffer.from(JSON.stringify(parsed), 'utf8');
  const result = {
    parseSucceeded: true,
    bytesIdentical: original.equals(reserialized),
    originalLength: original.length,
    reserializedLength: reserialized.length
  };
  if (comparison) {
    const expected = hmacSha256(comparison.key, reserialized);
    result.reserializedMatch = timingSafeSignatureMatch(expected, comparison.signatureValue, comparison.encoding);
  }
  return result;
}
