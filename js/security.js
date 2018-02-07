/*global firebase*/
/*global provider*/
/*global auth*/

var myApp = myApp || {};

myApp.security = {
    
    loginGithub: function() {
        firebase.auth().signInWithPopup(provider).then(function(result) {
            var uid = result.user.uid;
            myApp.userManagement.save(result.user);
            console.log(uid)
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