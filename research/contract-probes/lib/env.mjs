/**
 * Environment credential helper.
 * Retrieves CHAPA_SECRET_KEY only when explicitly invoked.
 *
 * @param {Object} env - The environment object (defaults to process.env)
 * @returns {string} The secret key
 * @throws {Error} If the credential is missing or empty
 */
export function requireChapaSecretKey(env = process.env) {
  const secret = env.CHAPA_SECRET_KEY;
  if (!secret || secret.trim() === '') {
    throw new Error('Missing required environment credential');
  }
  return secret;
}
