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
    storageUser: function(user) {
        if (!myApp.sessionStorage.getUser(user)) {
            sessionStorage.setItem('user', user);
        }
    },

    removeUser: function(user) {
        sessionStorage.removeItem('user');
    },

    getUser: function(user) {
        return sessionStorage.getItem('user');
    }

}

myApp.userManagement = {

    saveUser: function(user) {
        myApp.userManagement.userAlreadyExist(user.uid).then(function (exist) {
            if(exist === false) {
                database.ref('/users/' + user.uid).set(myApp.tools.purifyObject(user));
            } 
        });
    },

    userAlreadyExist: function(userId) {
        return new Promise(function(resolve, reject) {
            database.ref('/users/' + userId).once('value').then(function(snapshot) {
                snapshot.val() ? resolve(snapshot.val()) : resolve(false);
            });
        });
    },

    relationWithRecipe: function(userId, recipeId) {
        database.ref('/users-recipes/' + userId + '_' + recipeId).set({
            userId: userId,
            recipeId: recipeId
        });
    },

    favoriteRecipes: function(userId) {
        return new Promise(function(resolve,reject) {
            database.ref('/users-recipes/').orderByChild('userId').equalTo(userId).on('value', function(snapshot) {
                var favoriteRecipes = [];
                if(snapshot.val()) {
                    snapshot.forEach(function (element) {
                        favoriteRecipes.push(element.val().recipeId)
                    });
                }
                resolve(favoriteRecipes);
            })
        });
    },

    removeRelationBetweenUserAndrecipe: function(userId, recipeId) {
        database.ref('/users-recipes/' + userId + '_' + recipeId).remove();
    }

}

myApp.recipeManagement = {
    saveRecipe: function(recipe, verify) {
        if (verify) {
            myApp.recipeManagement.recipeAlreadyExist(recipe.id).then(
                function(exist) {
                    if (exist) {
                        console.log('La receta ya existe en la base de datos.')
                    }
                    else {
                        database.ref('/recipes/' + recipe.id).set(recipe);
                    }
                }
            ).catch(
                function(reason) {
                    console.log('The promise has been rejected. Reason: ', reason)
                }
            );
        }
        else {
            database.ref('/recipes/' + recipe.id).set(recipe);
        }
    },
    
    updateRecipe: function(recipe) {
        database.ref('/recipes/' + recipe.id).update(recipe);
    },

    recipeAlreadyExist: function(recipeId) {
        return new Promise(function(resolve, reject) {
            database.ref('/recipes/' + recipeId).once('value').then(function(snapshot) {
                snapshot.val() ? resolve(snapshot.val()) : resolve(false);
            });
        });
    },

    saveRecipeFromAPI: function(json, properties) {
        if (json[0] && json[0].uri) {
            var recipe = json[0];
            var recipeData = myApp.tools.getRightUriAndId(recipe.uri)
            recipe.uri = recipeData.uri;
            recipe.id = recipeData.id;
            if(properties.action === 'favorite') {
                recipe.favoriteCounter = 1;
            }
            myApp.recipeManagement.saveRecipe(recipe, false);
        }
        else {
            console.log('La receta no existe.');
        }
    },
    
    recipeMoreFavorites: function() {
        database.ref('/recipes/').orderByChild('favoriteCounter').limitToLast(2).once('value',function (snapshot) {
            console.log(snapshot.val())
        });
    }

}

myApp.UI = {

    showRecipes: function(datas) {
        var recipes = datas.hits,
            container = document.querySelector('.general-container'),
            recipe = null,
            recipeData = null;
            
        if(myApp.sessionStorage.getUser('user')) {
            myApp.userManagement.favoriteRecipes(myApp.sessionStorage.getUser('user')).then(function(favoriteRecipes) {
                
                for (var i = 0; i < recipes.length; i++) {
                    recipe = recipes[i].recipe;
                    recipeData = myApp.tools.getRightUriAndId(recipe.uri);
                    container.innerHTML +=
                        `<div class="image-container" data-recipeid="${recipe.uri}">
                        <span ${ myApp.tools.isFavorite(favoriteRecipes, recipeData.id) }>
                            <i class="fas fa-heart"></i>
                        </span>
                        <img src="${recipe.image}"></img>
                    <div>`;
                }
            });
        }
        else {
            for (var i = 0; i < recipes.length; i++) {
                recipe = recipes[i].recipe;
                container.innerHTML +=
                    `<div class="image-container" data-recipeid="${recipe.uri}">
                    <span>
                        <i class="fas fa-heart"></i>
                    </span>
                    <img src="${recipe.image}"></img>
                <div>`;
            }
        }

    },

    eventsListener: function() {
        document.querySelector('.general-container').addEventListener('click', function(e) {
            if (e.target.nodeName === 'I') {
                var userId = myApp.sessionStorage.getUser('user');

                if (userId) {
                    var recipeContainerTag = e.path[2],
                        recipeData = myApp.tools.getRightUriAndId(recipeContainerTag.getAttribute('data-recipeid'));


                        myApp.queryParams.r = recipeData.uri;

                        myApp.recipeManagement.recipeAlreadyExist(recipeData.id).then(
                            function(recipe) {
                                if(recipe) {
                                    if(!e.target.parentNode.classList.contains('js-favorite')) {   
                                        recipe.favoriteCounter += 1;
                                        myApp.recipeManagement.updateRecipe(recipe);
                                        myApp.userManagement.relationWithRecipe(userId, recipeData.id);
                                        e.target.parentNode.classList.add('js-favorite');
                                    }
                                    else {
                                        recipe.favoriteCounter -= 1;
                                        myApp.recipeManagement.updateRecipe(recipe);
                                        myApp.userManagement.removeRelationBetweenUserAndrecipe(userId, recipeData.id);
                                        e.target.parentNode.classList.remove('js-favorite');
                                    }
                                }
                                else {
                                    myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.recipeManagement.saveRecipeFromAPI,{action:'favorite'});
                                    myApp.userManagement.relationWithRecipe(userId, recipeData.id);
                                    e.target.parentNode.classList.add('js-favorite');
                                }
                            }
                        ).catch(
                            function(reason) {
                                console.log('The promise has been rejected. Reason: ', reason);
                            }
                        );
                }
                else {
                    console.log('Debe loguearse para realizar esta operación');
                }

            }
        });

        document.querySelector('.loginGithub').addEventListener('click', function() {
            myApp.security.loginGithub();
        });

        document.querySelector('.loginGoogle').addEventListener('click', function() {
            myApp.security.loginGoogle();
        });

        document.querySelector('.logoutGithub').addEventListener('click', function() {
            myApp.security.logoutGithub();
        });

        document.querySelector('.search').addEventListener('keyup', function(e) {
            if (e.keyCode === 13) {
                myApp.queryParams.q = this.value;
                // myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.UI.showRecipes);
                myApp.tools.makeAjaxRequest('GET', '../localDatas/recipes.json', myApp.UI.showRecipes);
            }
        });

    }
}

myApp.start = function() {
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
