import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-cambiar-en-produccion';

export function crearToken(email) {
  const payload = JSON.stringify({ email, ts: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const firma = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${firma}`;
}

export function verificarToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, firma] = token.split('.');
  const firmaEsperada = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  if (firma !== firmaEsperada) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return payload.email;
  } catch {
    return null;
  }
}
