/*global firebase*/
// Initialize Firebase
var config = {
    apiKey: "AIzaSyAe83GIo7Aq1tgASQoWFHjJKYafu1trXfM",
    authDomain: "recipesplanner.firebaseapp.com",
    databaseURL: "https://recipesplanner.firebaseio.com",
    projectId: "recipesplanner",
    storageBucket: "recipesplanner.appspot.com",
    messagingSenderId: "883542285030"
};

firebase.initializeApp(config);

/** @global */
var database = firebase.database();
/** @global */
var auth = firebase.auth();
/** @global */
var gitHubProvider = new firebase.auth.GithubAuthProvider();
/** @global */
var googleProvider = new firebase.auth.GoogleAuthProvider();