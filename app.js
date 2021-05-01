//Load config
const CONFIG = require('./config/config.json');
const UTILS = require('./utils.js');

//Express Server
const express = require('express');
const CORS = require('cors');
const EXPRESS = express();
EXPRESS.use(CORS());
EXPRESS.use(express.urlencoded({extended: true}));
EXPRESS.use(express.json());
const EXPRESS_PORT = CONFIG.EXPRESS.PORT;

//Start Server
EXPRESS.listen(EXPRESS_PORT, () => {
    console.log(`${CONFIG.EXPRESS.LOG_SERVER_RUNNING}${EXPRESS_PORT}`)
})

//Resolve URLs
EXPRESS.get(CONFIG.ROUTES.GET_ID, (req, res) => {
    return UTILS.getShortlink(req.params.id)
    .then((snap) => {
        if(snap.status == 200) return res.status(snap.status).send(snap);
        throw snap;
    }).catch((err) => {
        res.status(err.status).send(err);
    });
});

//Create URls
EXPRESS.post(CONFIG.ROUTES.POST_LINK, (req, res) => {
    UTILS.generateShortlink(req.body.id, req.body.url, req.body.auth)
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

