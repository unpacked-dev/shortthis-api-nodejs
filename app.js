//Load config
const CONFIG = require('./config/config.json');
const CONSTANTS = require('./config/constants.json');

//Init Firebase
const FIREBASE_ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./config/service_account.json');

FIREBASE_ADMIN.initializeApp({
  credential: FIREBASE_ADMIN.credential.cert(SERVICE_ACCOUNT),
});

const FIRESTORE = FIREBASE_ADMIN.firestore();
const DATABASE = FIRESTORE.collection('shortthis');

//FIREBASE FUNCTIONS
//Get destination URL from short ID
const FIREBASE_getShort = async (id) => {
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
class Short {
    constructor(status, comment, id, url) {
        this.status = status;
        this.id = id;
        this.url = url;
        this.comment = comment;
    }
};

//Checks if URL is https (secure) URL
const isSecureURL = (url) => {
    url = url.toLowerCase();
    return url.indexOf('https://') != -1 ? true : false;
};

//Get Domain URL
const getURLHostname = (url) => {
    url = url.toLowerCase();
    url = url.replaceAll('https://', '');
    url = url.replaceAll('http://', '');
    return url.split('/')[0];
}

//Checks if URL starts with https OR https
const urlIsHttpProtocol = (url) => {
    url = url.toLowerCase();
    return (url.indexOf('https://') != -1 || url.indexOf('http://') != -1) ? true : false;
}

//Prepare URL for shortening
const prepareURL = (url) => {
    let hostname = getURLHostname(url);
    let startsWithHttp = urlIsHttpProtocol(url);
    let isSecure = isSecureURL(url);
    let protocolAndHostname = startsWithHttp && isSecure ? 'https://' + hostname : hostname;
    protocolAndHostname = startsWithHttp && !isSecure ? 'http://' + hostname : protocolAndHostname;

    url = url.split("");
    url.splice(0, protocolAndHostname.length);
    url = url.join("");
    url = startsWithHttp ? protocolAndHostname + url : 'https://' + hostname + url;
    return url;
}

//Is chained?
const isChained = (url) => {
    url = addHttp(url);
    return url.indexOf('https://' + CONFIG.DOMAIN) != -1;
}

//Upgrade unsecure (http://) URL to more secure (https://)
//URL !RUN prepareURL(url) FIRST!
const upgradeSecureURL = (url) => {
    return url.replaceAll('http://', 'https://');
}

//Add https to URL which don't contain any
//!RUN prepareURL(url) FIRST!
const addHttp = (url) => {
    return (url.indexOf('https://') == -1 && url.indexOf('http://') == -1) ? 'https://' + url : upgradeSecureURL(url);
}

//Generate UUID for shortlinks
const generateUUID = () => {
    return Math.floor(Math.random() * 36 * 100000).toString(36).toUpperCase();
}

//Middleman function to start link creation process
const generateShortlink = async (id, url, auth) => {

    let short = new Short();

    //No URL => Exit
    if(!url) {
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.INVALID_URL_PROVIDED;
        short.status = 400;
        throw short;
    }

    //Manipulate URL
    url = prepareURL(url);
    url = upgradeSecureURL(url);

    if(isChained(url)) {
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.CHAINED_SHORTLINK;
        short.status = 400;
        throw short;
    }

    //Check if any ID is provided
    if(id && !auth) {
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.NO_AUTH;
        short.status = 401;
        throw short;
    }

    //Generate UUID if empty
    id = id ? id : generateUUID();

    //ID Already used?
    return FIREBASE_getShort(id)
    .then((snap) => {

        //ID Already taken?
        if(snap.status == 200) {
            short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.ID_ALREADY_USED;
            short.status = 400;
            throw short;
        }
        return true;

    //Not taken => Create shortlink
    }).then((snap) => {

        //Create shortlink
        return FIREBASE_setShort(id, url)
        .then((snap) => {

            //Successfully created?
            if(!snap) {
                short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.CHECK_PARAMETERS;
                short.status = 504;
                throw short;
            }
            short.comment = CONSTANTS.SUCCESS.SHORTLINK_CREATED;
            short.status = 201;
            short.id = id;
            short.url = url;
            return short;

        }).catch((err) => {
            throw err;
        });

    }).catch((err) => {
        throw err;
    });

}

//Express Server
const express = require('express');
const EXPRESS = express();
EXPRESS.use(express.urlencoded({extended: true}));
EXPRESS.use(express.json());
const EXPRESS_PORT = CONFIG.EXPRESS.PORT;

//Routing
//Resolve URLs
EXPRESS.get(CONFIG.ROUTES.GET_ID, (req, res) => {
    const id = req.params.id;

    FIREBASE_getShort(id).then((snap) => {
        if(snap.status == 200) {
            return res.status(snap.status).send(snap)
        }
        throw snap;
    }).catch((err) => {
        return res.status(err.status).send(err);
    });
});

//SERVER FUNCTIONS
//Create URls
EXPRESS.post(CONFIG.ROUTES.POST_LINK, (req, res) => {
    
    //Read parameters
    let id = req.body.id;
    let url = req.body.url;
    let auth = req.body.auth;

    generateShortlink(id, url, auth)
    .then((snap) => {
        if(snap.status == 201) {
            res.status(snap.status).send(snap);
            return true;
        }
        throw snap;
    }).catch((err) => {
        res.status(err.status).send(err);
    });
});

//Start Server
EXPRESS.listen(EXPRESS_PORT, () => {
    console.log(`${CONFIG.EXPRESS.LOG_SERVER_RUNNING}${EXPRESS_PORT}`)
})