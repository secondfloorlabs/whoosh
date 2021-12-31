import admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

export { admin, db };
