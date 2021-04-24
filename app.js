//Load config
const CONFIG = require('./config/config.json');
const CONSTANTS = require('./config/constants.json');

//Init Firebase
const FIREBASE_ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./config/service_account.json');

FIREBASE_ADMIN.initializeApp({
  credential: FIREBASE_ADMIN.credential.cert(SERVICE_ACCOUNT),
  databaseURL: CONFIG.FIREBASE.DATABASE_URL,
});

const FIRESTORE = FIREBASE_ADMIN.firestore();
const DATABASE = FIRESTORE.collection('shortthis');

//FIREBASE FUNCTIONS
//Get destination URL from short ID
const FIREBASE_getShort = async (id) => {
    return DATABASE.doc(id).get()
    .then((snap) => {
        return snap.data().url;
    })
    .catch((err) => {
        return null;
    });
};

//Set destination URL to short ID
const FIREBASE_setShort = async (id, url) => {
    return DATABASE.doc(id).set({
        url: url,
    })
    .then((snap) => {
        return true;
    })
    .catch((err) => {
        return false;
    });
};

//LOCAL FUNCTIONS
//Checks if URL is https (secure) URL
const isSecureURL = (url) => {
    return url.indexOf('https://') != -1 ? true : false;
};

//Upgrade unsecure (http://) URL to more secure (https://) URL
const upgradeSecureURL = (url) => {
    return url.replaceAll('http://', 'https://');
}

//Add https to URL which don't contain any
const addHttp = (url) => {
    return (url.indexOf('https://') == -1 && url.indexOf('http://') == -1) ? 'https://' + url : upgradeSecureURL(url);
}

//Generate UUID for shortlinks
const generateUUID = () => {
    return Math.floor(Math.random() * 36 * 100000).toString(36).toUpperCase();
}

//Middleman function to start link creation process
const generateShortlink = async (id, url, auth) => {

    //Check parameters
    //Check auth //ToDo: Real Authentification
    if(id && !auth) return CONSTANTS.ERRORS.NO_AUTH;

}

//Express Server
const express = require('express');
const EXPRESS = express();
EXPRESS.use(express.urlencoded({extended: true}));
const EXPRESS_PORT = CONFIG.EXPRESS.PORT;

//Routing
//Resolve URLs
EXPRESS.get(CONFIG.ROUTES.GET_ID, (req, res) => {
    const id = req.params.id;

    FIREBASE_getShort(id).then((snap) => {
        if(snap) return res.status(200).send(snap)
        else throw `${CONSTANTS.ERRORS.COULD_NOT_RESOLVE} "${id}".`
    }).catch((err) => {
        return res.status(404).send(err);
    });
});

//SERVER FUNCTIONS
//Create URls
EXPRESS.post(CONFIG.ROUTES.POST_LINK, (req, res) => {
    
    //Read parameters
    let id = req.body.id;
    let url = req.body.url;
    let auth = req.body.auth;

    //Parameters may be invalid
    if(!id) return res.status(400).send(CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.INVALID_ID_PROVIDED);
    else if(!url) return res.status(400).send(CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.INVALID_URL_PROVIDED);

    //ID already used?
    FIREBASE_getShort(id)
    .then((snap) => {
        if(!snap) return;
        else throw CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.ID_ALREADY_USED;

    //Unused
    }).then((snap) => {
        //Do URL manipulation
        url = addHttp(url); //Add secure https://

        //Create URL
        FIREBASE_setShort(id, url)
        .then((snap) => {
            if(snap) return res.status(201).send(CONSTANTS.SUCCESS.SHORTLINK_CREATED);
            else throw CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.CHECK_PARAMETERS;
        }).catch((err) => {
            return res.status(504).send(err);
        });
    })

    //Error if id is already used
    .catch((err) => {
        return res.status(500).send(err);
    });
});

//Start Server
EXPRESS.listen(EXPRESS_PORT, () => {
    console.log(`${CONFIG.EXPRESS.LOG_SERVER_RUNNING}${EXPRESS_PORT}`)
})