import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
dotenv.config();

const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
const hasGcpCredentials = existsSync(adcPath) || !!process.env.K_SERVICE;

let adminAuth = null;

if (hasGcpCredentials) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  }
  try {
    const admin = await import('firebase-admin');
    admin.default.initializeApp({
      projectId: process.env.GCP_PROJECT_ID || 'turing-lyceum-496405-e0',
    });
    adminAuth = admin.default.auth();
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.warn('⚠️ Firebase Admin init failed:', error.message);
  }
} else {
  console.log('ℹ️ Firebase Auth skipped (run: gcloud auth application-default login)');
}

export async function verifyAuthToken(idToken) {
  if (!adminAuth) return { uid: 'local-user', email: 'local@dev.com' };
  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    throw new Error(`Auth verification failed: ${error.message}`);
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !adminAuth) {
    req.user = { uid: 'anonymous', email: null };
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  verifyAuthToken(token)
    .then(user => { req.user = user; next(); })
    .catch(() => { req.user = { uid: 'anonymous', email: null }; next(); });
}

const firebaseApp = null;
export { firebaseApp };
export default { verifyAuthToken, optionalAuth, firebaseApp };
