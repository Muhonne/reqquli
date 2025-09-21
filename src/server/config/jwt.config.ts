// MORGAN: Centralized JWT configuration for security consistency
// This module ensures consistent JWT secret handling across the application

/**
 * Get the JWT secret from environment with production safeguards
 * @returns The validated JWT secret
 * @throws Process exits if JWT_SECRET is missing or invalid in production
 */
export const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    console.error('FATAL: JWT_SECRET must be configured and at least 32 characters');
    console.error('Please set JWT_SECRET environment variable with a secure value');
    console.error('Generate one with: openssl rand -base64 32');
    process.exit(1);
  }

  // Only check for weak secrets in production
  if (process.env.NODE_ENV === 'production') {
    // Check for common weak secrets
    const weakSecrets = [
      'secret', 'password', 'changeme', 'default',
      'quire-dev', 'development', 'test', 'demo', 'insecure'
    ];

    const lowerSecret = secret.toLowerCase();
    if (weakSecrets.some(weak => lowerSecret.includes(weak))) {
      console.error('FATAL: JWT_SECRET appears to be a weak or default value');
      console.error('Production requires a secure random secret');
      console.error('Generate one with: openssl rand -base64 32');
      process.exit(1);
    }
  } else if (process.env.NODE_ENV !== 'test') {
    // Warn in development if using a weak secret
    const lowerSecret = secret.toLowerCase();
    if (lowerSecret.includes('dev') || lowerSecret.includes('test') || lowerSecret.includes('change')) {
      console.warn('⚠️  WARNING: JWT_SECRET appears to contain weak patterns');
      console.warn('⚠️  For production, use: openssl rand -base64 32');
    }
  }
  
  return secret;
};

// Export configured JWT secret
export const JWT_SECRET = getJWTSecret();

// Export JWT token expiration settings
// Using plain object for jsonwebtoken compatibility
export const JWT_EXPIRATION = {
  ACCESS_TOKEN: '4h',
  REFRESH_TOKEN: '7d',
  VERIFICATION_TOKEN: '24h'
};