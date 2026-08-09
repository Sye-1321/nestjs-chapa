/**
 * Sanitizes candidate provider data.
 * @param {any} data - The data to sanitize
 * @returns {Object} The candidate result
 */
export function sanitize(data) {
  function recurse(obj, inSensitiveContext = false) {
    if (inSensitiveContext && obj !== null && typeof obj !== 'object') {
      if (typeof obj === 'string') return 'FICTIONAL_REDACTED';
      if (typeof obj === 'number') return 0;
      if (typeof obj === 'boolean') return false;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => recurse(item, inSensitiveContext));
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized = Object.create(null);
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
        const isSensitiveName = [
          'firstname',
          'lastname',
          'middlename',
          'fullname',
          'customername',
          'payername',
          'accountholdername'
        ].includes(normalizedKey);

        const isCredentialName = [
          'password',
          'passwd',
          'token',
          'accesstoken',
          'refreshtoken',
          'credential',
          'credentials',
          'privatekey',
          'webhooksecret'
        ].includes(normalizedKey);

        const isSensitive = inSensitiveContext || isSensitiveName || isCredentialName || (
          lowerKey.includes('authorization') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('signature') ||
          lowerKey.includes('email') ||
          lowerKey.includes('phone') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('apikey')
        );

        if (isSensitive) {
          if (typeof value === 'string') {
            sanitized[key] = 'FICTIONAL_REDACTED';
          } else if (typeof value === 'number') {
            sanitized[key] = 0;
          } else if (typeof value === 'boolean') {
            sanitized[key] = false;
          } else {
            sanitized[key] = recurse(value, true);
          }
        } else {
          sanitized[key] = recurse(value, false);
        }
      }
      return sanitized;
    }
    return obj;
  }

  const result = recurse(data, false);

  return {
    data: result,
    humanReviewRequired: true,
    stageReady: false
  };
}
