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

var database = firebase.database();
var auth = firebase.auth();
var gitHubProvider = new firebase.auth.GithubAuthProvider();
var googleProvider = new firebase.auth.GoogleAuthProvider();