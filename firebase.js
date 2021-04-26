//Init Firebase
const FIREBASE_ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./config/service_account.json');

FIREBASE_ADMIN.initializeApp({
    credential: FIREBASE_ADMIN.credential.cert(SERVICE_ACCOUNT),
});

const FIRESTORE = FIREBASE_ADMIN.firestore();
const DATABASE = FIRESTORE.collection('shortthis');

const Short = require('./short.js');
const CONSTANTS = require('./config/constants.json');

//Get destination URL from short ID
const getShort = async (id) => {
    let short = new Short();

    return DATABASE.doc(id).get()
    .then((snap) => {
        short.id = id;
        short.comment = 'success';
        short.status = 200;
        short.url = snap.data().url;
        return short;
    })
    .catch((err) => {
        short.comment = `${CONSTANTS.ERRORS.COULD_NOT_RESOLVE}'${id}'`;
        short.status = 504;
        return short;
    });
};

//Set destination URL to short ID
const setShort = async (id, url) => {
    return DATABASE.doc(id).set({
        url: url
    })
    .then((snap) => {
        return true;
    })
    .catch((err) => {
        return false;
    });
};

module.exports = {
    getShort,
    setShort,
}