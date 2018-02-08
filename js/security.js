/*global firebase*/
/*global gitHubProvider*/
/*global googleProvider*/
/*global auth*/

var myApp = myApp || {};

myApp.security = {
    
    loginGithub: function() {
        firebase.auth().signInWithPopup(gitHubProvider).then(function(result) {
            myApp.userManagement.save(result.user);
        }).catch(function(error) {
            console.log(error)
        });
    },
    
    loginGoogle: function() {
        firebase.auth().signInWithPopup(googleProvider).then(function(result) {
            myApp.userManagement.save(result.user);
        }).catch(function(error) {
            console.log(error)
        });
    },
    
    logoutGithub: function() {
        firebase.auth().signOut().then(function() {
            console.log("User logout!")
        }).catch(function(error) {
            console.log(error)
        });
    }
}

auth.onAuthStateChanged(function(user) {
    if (user) {
      document.querySelector('body').style.backgroundColor = '#0F0';
      myApp.sessionStorage.storageUser(user.uid);
    } else {
      document.querySelector('body').style.backgroundColor = '#F00';
      myApp.sessionStorage.removeUser('user');
    }
})