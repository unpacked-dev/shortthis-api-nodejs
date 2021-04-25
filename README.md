# shortthis-api
Development repository for shortthis backend API

# Installation
### Install Nodejs
https://nodejs.org/en/

### Install shorthis API server
1. Create your Project on firebase https://console.firebase.google.com/
2. Create the serviceworker config file <br>
- "Project settings" -> "Service worker" -> "Create private key" <br>
- Rename file to "service_account.json" and paste it into the config folder
3. Create a Firebase "Firestore Database"
4. Create a collection on your database named "shortthis"
5. Download latest release of shortthis-api https://github.com/unpacked-dev/shortthis-api/releases
6. Install dependencies <br>
```
cd $YOUR_FOLDER$
```
```
npm i express
```
```
npm i firebase-admin
```
7. Edit your config.json file https://github.com/unpacked-dev/shortthis-api/wiki/Config-file
8. Run shortthis <br>
```
node app.js
```

# Documentation
https://github.com/unpacked-dev/shortthis-api/wiki
