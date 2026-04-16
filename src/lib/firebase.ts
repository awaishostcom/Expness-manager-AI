import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * IMPORTANT FOR GITHUB PAGES:
 * Make sure to add 'awaishostcom.github.io' to the "Authorized domains" 
 * in your Firebase Console (Authentication -> Settings -> Authorized domains).
 */

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore
export const db = initializeFirestore(app, {}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Connection test
async function testConnection() {
  try {
    // Attempt fresh connection check without terminating the main instance
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection test successful.");
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.error("CRITICAL: Firestore is still offline. This often means the database DOES NOT EXIST in your console, OR the Authorized Domains are not set up.");
    }
    // We don't terminate or clear persistence globally as it breaks the instance for the whole app
  }
}

testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
