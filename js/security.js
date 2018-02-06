/*global firebase*/

var myApp = myApp || {};

myApp.security = {
    loginGithub: function() {
        firebase.auth().signInWithPopup(provider).then(function(result) {
            var uid = result.user.uid;
            console.log(uid)
        }).catch(function(error) {
            console.log(error)
        });
    },
    
    logoutGithub: function() {
        console.log('aki')
        firebase.auth().signOut().then(function() {
            console.log("Pa fuera!")
        }).catch(function(error) {
            console.log(error)
        });
    }
}