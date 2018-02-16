/*global auth*/
/*global database*/

var myApp = myApp || {};


myApp.queryParams = {
    app_id: myApp.config.appId,
    app_key: myApp.config.appKey,
    q: null,
    r: null,
    from: null,
    to: null
}

myApp.sessionStorage = {
    storageUser: function (user) {
        if(!myApp.sessionStorage.getUser(user)){
            sessionStorage.setItem('user', user);
        }
    },
    
    removeUser: function (user) {
        sessionStorage.removeItem('user');
    },
    
    getUser: function (user) {
        return sessionStorage.getItem('user');
    }
    
}

myApp.userManagement = {
    
    saveUser: function (user) {
        if(!myApp.userManagement.userAlreadyExist(user.uid)){
            database.ref('/users/'+user.uid).set(myApp.tools.purifyObject(user));
        }
    },
    
    userAlreadyExist:function (userId) {
        var promise = new Promise(function (resolve, reject) {
            database.ref('/users/'+userId).once('value').then(function (snapshot) {
                resolve ((snapshot.val() && snapshot.val().uid) || false);
            });
        });
        return promise;
    },
    
    relationWithRecipe: function (userId, recipeId) {
        database.ref('/users-recipes/'+ userId+'_'+recipeId).set({
            userId: userId,
            recipeId: recipeId
        });
    },
    
    removeRelationWithRecipe: function (userId, recipeId) {
        database.ref('/users-recipes/'+userId+'_'+recipeId).remove();
    }
    
}

myApp.recipeManagement = {
    saveRecipe: function (recipe, verify){
        if (verify) {
            myApp.recipeManagement.recipeAlreadyExist(recipe.id).then(
                function (exist) {
                    if (exist) {
                        console.log('La receta ya existe en la base de datos.')
                    } else {
                        database.ref('/recipes/'+recipe.id).set(recipe);
                    }
                }
            ).catch(
                function (reason) {
                    console.log('The promise has been rejected. Reason: ', reason)
                }
            );
        } else {
            database.ref('/recipes/'+recipe.id).set(recipe);
        }
    },
    
    recipeAlreadyExist:function (recipeId) {
        var promise = new Promise(function (resolve, reject) {
            database.ref('/recipes/'+recipeId).once('value').then(function (snapshot) {
                if (snapshot.val()) {
                    resolve(snapshot.val());
                } else {
                    resolve(false);
                }
            });
        });
        return promise;
    },
    
    saveRecipeFromAPI: function (json) {
        if (json[0] && json[0].uri) {
            var recipe = json[0];
            var recipeData = myApp.tools.getRightUriAndId(recipe.uri)
            recipe.uri = recipeData.uri;
            recipe.id = recipeData.id;
            myApp.recipeManagement.saveRecipe(recipe, false);
        } else {
            console.log('La receta no existe.');
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
            container.innerHTML += 
            `<div class="image-container" data-recipeid="${recipe.uri}">
                <span>
                    <i class="fas fa-heart"></i>
                </span>
                <img src="${recipe.image}"></img>
            <div>`;
        }
    },
    
    eventsListener: function () {
         document.querySelector('.general-container').addEventListener('click',function (e) {
            if (e.target.nodeName === 'I') {
                var userId = myApp.sessionStorage.getUser('user');
                
                if (userId) {
                    var recipeContainerTag = e.path[2],
                        recipeData = myApp.tools.getRightUriAndId(recipeContainerTag.getAttribute('data-recipeid'));
                    
                    if (!e.target.parentNode.classList.contains('favorite')) {
                        
                        myApp.queryParams.r = recipeData.uri;
                        
                        myApp.recipeManagement.recipeAlreadyExist(recipeData.id).then(
                            function (exist) {
                                if (exist === false) {
                                    myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.recipeManagement.saveRecipeFromAPI);
                                }
                                myApp.userManagement.relationWithRecipe(userId,recipeData.id);  
                                e.target.parentNode.classList.add('favorite');
                            }
                        ).catch(
                            function (reason) {
                                console.log('The promise has been rejected. Reason: ', reason)
                            }
                        );
                    } else {
                        myApp.userManagement.removeRelationWithRecipe(userId,recipeData.id);
                        e.target.parentNode.classList.remove('favorite');
                    }
                    
                } else {
                    console.log('Debe loguearse para realizar esta operación');
                }
                
            }
        });
        
        document.querySelector('.loginGithub').addEventListener('click',function () {
            myApp.security.loginGithub();
        }); 
        
        document.querySelector('.loginGoogle').addEventListener('click',function () {
            myApp.security.loginGoogle();
        });

        document.querySelector('.logoutGithub').addEventListener('click',function () {
            myApp.security.logoutGithub();
        });
        
        document.querySelector('.search').addEventListener('keyup',function (e) {
            if (e.keyCode === 13) {
                myApp.queryParams.q = this.value;
                // myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.UI.showRecipes);
                myApp.tools.makeAjaxRequest('GET','../localDatas/recipes.json', myApp.UI.showRecipes);
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

//TODO
/*
Refactorizar lógica de inserción de recetas
Documentar con JSDoc
*/