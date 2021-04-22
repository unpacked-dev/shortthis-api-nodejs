// Init Firebase
const FIREBASE_ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./config/service_account.json');

FIREBASE_ADMIN.initializeApp({
  credential: FIREBASE_ADMIN.credential.cert(SERVICE_ACCOUNT),
  databaseURL: "https://shortthis-d96bc-default-rtdb.europe-west1.firebasedatabase.app"
});

const FIRESTORE = FIREBASE_ADMIN.firestore();
const DATABASE_COLLECTION = FIRESTORE.collection('shortthis');

//Write Data
DATABASE_COLLECTION.doc('testlink').set({
    short: 'https://unpacked.dev',
});

//Get Data
DATABASE_COLLECTION.doc('testlink').get().then((snapshot) => {
    console.log(snapshot.data().short);
});