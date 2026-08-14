import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let firebaseApp: any = null;
let firestoreDb: any = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);
  }
} catch (e) {
  console.warn('Erro ao inicializar Firebase:', e);
}

export const app = firebaseApp;
export const auth = null as any;
export const db = firestoreDb;

/**
 * Sanitiza recursivamente objetos para o Firestore (remove valores undefined)
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as unknown as T;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}



