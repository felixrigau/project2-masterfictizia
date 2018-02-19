/*global firebase*/
/*global gitHubProvider*/
/*global googleProvider*/
/*global auth*/

/** @global */
var myApp = myApp || {};

myApp.security = {
    
    /** @function
    * @name loginGithub
    * @description Ejecuta el mecanismo de login Oauth con Github que proporciona firebase  
    */
    loginGithub: function() {
        firebase.auth().signInWithPopup(gitHubProvider).then(function(result) {
            myApp.userManagement.saveUser(result.user);
        }).catch(function(error) {
            console.log(error)
        });
    },
    
    /** @function
    * @name loginGoogle
    * @description Ejecuta el mecanismo de login Oauth con Google que proporciona firebase  
    */
    loginGoogle: function() {
        firebase.auth().signInWithPopup(googleProvider).then(function(result) {
            myApp.userManagement.saveUser(result.user);
        }).catch(function(error) {
            console.log(error)
        });
    },
    
    /** @function
    * @name logoutUser
    * @description Ejecuta el mecanismo de logout que proporciona firebase  
    */
    logoutUser: function() {
        firebase.auth().signOut().then(function() {
            console.log("User logout!")
        }).catch(function(error) {
            console.log(error)
        });
    }
}

/** @function
* @description Define el comportamiento del evento "onAuthStateChanged" de la instacion auth.Este se dispara cuando ocurre las acciones de login o logout 
*/
auth.onAuthStateChanged(function(user) {
    if (user) {
      document.querySelector('body').style.backgroundColor = 'fafafa';
      myApp.sessionStorage.storageUser(user.uid);
    } else {
      document.querySelector('body').style.backgroundColor = '#4dd0e1';
      myApp.sessionStorage.removeUser();
    }
})