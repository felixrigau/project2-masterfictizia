/*global auth*/

var myApp = myApp || {};

// var url = `https://api.edamam.com/search?q=chicken&app_id=${myApp.config.appId}&app_key=${myApp.config.appKey}&from=0&to=1`;
var url = '../localDatas/recipes.json';

auth.onAuthStateChanged(function(user) {
    if (user) {
      document.querySelector('body').style.backgroundColor = '#0F0';
      var uid = user.uid;
    } else {
      document.querySelector('body').style.backgroundColor = '#F00';
    }
})

document.querySelector('.loginGithub').addEventListener('click',function () {
    myApp.security.loginGithub();
})

document.querySelector('.logoutGithub').addEventListener('click',function () {
    myApp.security.logoutGithub();
})