const CONFIG = require('./config/config.json');
const Short = require('./short.js');
const FIREBASE = require('./firebase.js');
const CONSTANTS = require('./config/constants.json');

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
const upgradeSecureURL = (url) => {
    url = prepareURL(url);
    return url.replaceAll('http://', 'https://');
}

//Add https to URL which don't contain any
const addHttp = (url) => {
    url = prepareURL(url);
    return (url.indexOf('https://') == -1 && url.indexOf('http://') == -1) ? 'https://' + url : upgradeSecureURL(url);
}

//Generate UUID for shortlinks
const generateUUID = () => {
    const multiplier = Math.pow(10, CONFIG.UUID_LENGTH);
    return Math.floor(Math.random() * 36 * multiplier).toString(36).toUpperCase();
}

const getShortlink = async (id) => {
    return FIREBASE.getShort(id).then((snap) => {
        if(snap.status == 200) {
            return snap;
        }
        throw snap;
    }).catch((err) => {
        throw err;
    });
}

//Check if Auth is valid
const isValidAuth = async (auth) => {

    //When there is no auth
    if(!auth) return true;

    return FIREBASE.getAuth(auth)
    .then((snap) => {
        if(snap.auth) return true;
        return false;
    }).catch((err) => {
        return false;
    });
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

    //XSS
    if(url.indexOf('<') != -1 || url.indexOf('>') != -1) {
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.INVALID_URL_PROVIDED;
        short.status = 400;
        throw short;
    }

    if(isChained(url)) {
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.CHAINED_SHORTLINK;
        short.status = 400;
        throw short;
    }

    //Custom id but no auth provided?
    if(id && !auth) {
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.NO_AUTH;
        short.status = 401;
        throw short;
    }

    //If no custom ID, no auth required => dont check for auth
    if(!id && auth) auth = "";

    //Generate UUID if empty
    id = id ? id : generateUUID();

    //Check Auth
    return isValidAuth(auth)
    .then((snap) => {

        //Auth success
        if(snap) return true;

        //Auth failed
        short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.NO_AUTH;
        short.status = 401;
        throw short;

    }).then((snap) => {

        //ID Already used?
        return getShortlink(id)
        .then((snap) => {

            console.log(snap);

            //ID Already taken?
            if(snap.status == 200) {
                short.comment = CONSTANTS.ERRORS.COULD_NOT_CREATE + CONSTANTS.ERRORS.ID_ALREADY_USED;
                short.status = 400;
                throw short;
            }

            return true;
        }).catch((err) => {
            return err;
        });

    //Not taken => Create shortlink
    }).then((snap) => {

        //Create shortlink
        return FIREBASE.setShort(id, url)
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

module.exports = {
    generateShortlink,
    getShortlink,
}