// Imported first by e2e.test.ts so src/lib/firebase.ts initialises against the demo project.
export const PROJECT = "demo-krealink";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = PROJECT;
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "demo-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = `${PROJECT}.firebaseapp.com`;
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = `${PROJECT}.appspot.com`;
