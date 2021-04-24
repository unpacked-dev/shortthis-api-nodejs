//Init Firebase
const FIREBASE_ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./config/service_account.json');

FIREBASE_ADMIN.initializeApp({
  credential: FIREBASE_ADMIN.credential.cert(SERVICE_ACCOUNT),
  databaseURL: "https://shortthis-d96bc-default-rtdb.europe-west1.firebasedatabase.app"
});

const FIRESTORE = FIREBASE_ADMIN.firestore();
const DATABASE = FIRESTORE.collection('shortthis');

//FIREBASE FUNCTIONS
//Get destination URL from short ID
const getShort = async (id) => {
    return DATABASE.doc(id).get()
    .then((snap) => {
        return snap.data().url;
    })
    .catch((err) => {
        return null;
    });
};

//Set destination URL to short ID
const setShort = async (id, url) => {
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

//Express Server
const express = require('express');
const EXPRESS = express();
EXPRESS.use(express.urlencoded({extended: true}));
const EXPRESS_PORT = 3000;

//Routing
//Resolve URLs
EXPRESS.get('/api/get/:id', (req, res) => {
    const id = req.params.id;

    getShort(id).then((snap) => {
        if(snap) return res.status(200).send(snap)
        else throw `Could not get destination of "${id}"`
    }).catch((err) => {
        return res.status(404).send(err);
    });
});

//SERVER FUNCTIONS
//Create URls
EXPRESS.post('/api/post', (req, res) => {
    
    //Read parameters
    let id = req.body.id;
    let url = req.body.url;

    //Parameters may be invalid
    if(!id) return res.status(400).send('Could not create shortlink. Invalid ID provided.');
    else if(!url) return res.status(400).send('Could not create shortlink. Invalid URL provided.');

    //ID already used?
    getShort(id)
    .then((snap) => {
        if(!snap) return;
        else throw 'Could not create shortlink. Shortlink id already in use.'

    //Unused
    }).then((snap) => {
        //Do URL manipulation
        url = addHttp(url); //Add secure https://

        //Create URL
        setShort(id, url)
        .then((snap) => {
            if(snap) return res.status(201).send('Shortlink successfully created.');
            else throw 'Could not create shortlink. Check parameters or try again later.';
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
    console.log(`Shortthis server listening at http://localhost:${EXPRESS_PORT}`)
})