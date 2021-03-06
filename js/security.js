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
            myApp.UI.triggerNotification('success','Bienvenid@! a Recipes Planner',3000);
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
            myApp.UI.triggerNotification('success','Bienvenid@! a Recipes Planner',3000);
        }).catch(function(error) {
            myApp.UI.triggerNotification('error',error,3000);
        });
    },
    
    /** @function
    * @name logoutUser
    * @description Ejecuta el mecanismo de logout que proporciona firebase  
    */
    logoutUser: function() {
        firebase.auth().signOut().then(function() {
            myApp.UI.triggerNotification('success','Hasta pronto!',3000);
        }).catch(function(error) {
            myApp.UI.triggerNotification('error',error,3000);
        });
    }
}

/** @function
* @description Define el comportamiento del evento "onAuthStateChanged" de la instacion auth.Este se dispara cuando ocurre las acciones de login o logout 
*/
auth.onAuthStateChanged(function(user) {
    if (user) {
        myApp.UI.createUserArea(user);
        myApp.sessionStorage.storageUser(user.uid);
    } else {
        myApp.UI.createLogginArea();
        myApp.sessionStorage.removeUser();
        myApp.UI.clearFavoritesContainer();
        myApp.UI.unmarkAsfavoriteAllRecipes();
    }
})