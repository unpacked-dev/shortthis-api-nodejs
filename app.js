// Init Firebase
const FIREBASE_ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./config/service_account.json');

FIREBASE_ADMIN.initializeApp({
  credential: FIREBASE_ADMIN.credential.cert(SERVICE_ACCOUNT),
  databaseURL: "https://shortthis-d96bc-default-rtdb.europe-west1.firebasedatabase.app"
});

const FIRESTORE = FIREBASE_ADMIN.firestore();
const DATABASE = FIRESTORE.collection('shortthis');

//Get destination URL from short ID
const getShort = (id) => {
    DATABASE.doc(id).get()
    .then((snap) => {
        console.log(snap.data().url);
    })
    .catch((err) => {
        console.log('Could not get short...');
    });
};

//Set destination URL to short ID
const setShort = (id, url) => {
    DATABASE.doc(id).set({
        url: url,
    });
};