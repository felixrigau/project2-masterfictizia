/*global auth*/
/*global database*/

var myApp = myApp || {};


var queryParams = {
    app_id: myApp.config.appId,
    app_key: myApp.config.appKey,
    q: null,
    r: null,
    from: null,
    to: null
}

myApp.recipeManagement = {
    saveRecipe: function (data){
        if (data && data[0]) {
            var id = myApp.tools.extractRecipesIdFromUri(data[0].uri);
            database.ref('/recipes/'+id).set(data[0]);
        }
    }
    
}

myApp.UI = {
    
    showRecipes: function(datas){
        var recipes = datas.hits,
            container = document.querySelector('.general-container'),
            recipe = null;
            
        for(var i = 0; i < recipes.length; i++){
            recipe = recipes[i].recipe;
            container.innerHTML += `<img data-recipeid="${recipe.uri}" src="${recipe.image}">`;
        }
    },
    
    eventsListener: function () {
        document.querySelector('.loginGithub').addEventListener('click',function () {
            myApp.security.loginGithub();
        });

        document.querySelector('.logoutGithub').addEventListener('click',function () {
            myApp.security.logoutGithub();
        });
        
        document.querySelector('.search').addEventListener('keyup',function (e) {
            if (e.keyCode === 13) {
                queryParams.q = this.value;
                // myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(queryParams), myApp.UI.showRecipes);
                myApp.tools.makeAjaxRequest('GET','../localDatas/recipes.json', myApp.UI.showRecipes);
            }
        });
        
        document.querySelector('.general-container').addEventListener('click',function (e) {
            var id = null;
            
            if (e.target.nodeName === 'IMG') {
                id = e.target.getAttribute('data-recipeid');
                queryParams.q = null;
                queryParams.r = myApp.tools.getRightUri(id);
                myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(queryParams), myApp.recipeManagement.saveRecipe);
            }
        });
    }
}

myApp.start = function () {
    myApp.UI.eventsListener()
}
myApp.start();

// var url = `https://api.edamam.com/search?`;
// var url = '../localDatas/recipes.json';