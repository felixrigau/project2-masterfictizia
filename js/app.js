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

    favoriteRecipesIdByUser: function(userId) {
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
    
    favoriteRecipesByUser: function(userId) {
        var favoriteRecipes = [];
        return new Promise(function(resolve,reject) {
            database.ref('/users-recipes/').orderByChild('userId').equalTo(userId).on('child_added', function(snapshot) {
                    let recipeRef = database.ref('/recipes/'+snapshot.val().recipeId).once('value').then(function(snapRecipe) {
                        favoriteRecipes.push(snapRecipe.val());
                    }
                );
            })
            resolve(favoriteRecipes)
        });
    }

}

myApp.recipe = {
    management: {
        saveRecipe: function(recipe, verify) {
            if (verify) {
                myApp.recipe.management.recipeAlreadyExist(recipe.id).then(
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
                else {
                    properties.callback(recipe);
                    recipe.favoriteCounter = 0;
                }
                myApp.recipe.management.saveRecipe(recipe, false);
            }
            else {
                console.log('La receta no existe.');
            }
        },
        
        addRelationWithUser: function(userId, recipeId) {
            database.ref('/users-recipes/' + userId + '_' + recipeId).set({
                userId: userId,
                recipeId: recipeId
            });
        },
        
        removeRelationWithUser: function(userId, recipeId) {
            database.ref('/users-recipes/' + userId + '_' + recipeId).remove();
        },
        
        recipeMoreFavorites: function(amount) {
            database.ref('/recipes/').orderByChild('favoriteCounter').limitToLast(amount).once('value',function (snapshot) {
                console.log(snapshot.val())
            });
        },
        
        increaseFavoriteCounter:function(recipe) {
            recipe.favoriteCounter += 1;
            myApp.recipe.management.updateRecipe(recipe);
        },
        
        decreaseFavoriteCounter:function(recipe) {
            if(recipe.favoriteCounter >= 1) {
                recipe.favoriteCounter -= 1;
            }
            myApp.recipe.management.updateRecipe(recipe);
        }
    },
    
    ui: {
        favoriteAction:function(event) {
            var userId = myApp.sessionStorage.getUser('user');
            if (userId) {
                var actionsContainerTag = event.path[2],
                    recipeData = myApp.tools.getRightUriAndId(actionsContainerTag.getAttribute('data-recipeid')),
                    recipeId = recipeData.id,
                    spanTag = event.target.parentNode;
                    myApp.queryParams.r = recipeData.uri;

                myApp.recipe.management.recipeAlreadyExist(recipeId).then(
                    function(recipe) {
                        var parameters = {recipeId: recipeId, spanTag: spanTag, userId: userId, recipe: recipe};
                        if(recipe) {
                            if(!myApp.UI.containsClass(spanTag, 'js-favorite')) {   
                                myApp.recipe.ui.markAsfavorite(parameters);
                            }
                            else {
                                myApp.recipe.ui.unmarkAsfavorite(parameters);
                            }
                        }
                        else {
                            myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.recipe.management.saveRecipeFromAPI,{action:'favorite'});
                            myApp.recipe.ui.markAsfavorite(parameters);
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
        },
        
        viewAction:function(event) {
            var actionsContainerTag = event.path[2],
                    recipeData = myApp.tools.getRightUriAndId(actionsContainerTag.getAttribute('data-recipeid')),
                    recipeId = recipeData.id;
                    myApp.queryParams.r = recipeData.uri;

                myApp.recipe.management.recipeAlreadyExist(recipeId).then(
                    function(recipe) {
                        if(recipe) {
                            myApp.recipe.ui.showRecipe(recipe)
                        }
                        else {
                            myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.recipe.management.saveRecipeFromAPI, {action:'view', callback:myApp.recipe.ui.showRecipe});
                        }
                    }
                ).catch(
                    function(reason) {
                        console.log('The promise has been rejected. Reason: ', reason);
                    }
                );
        },
        
        markAsfavorite:function(obj) {
            if(obj.recipe) {
                myApp.recipe.management.increaseFavoriteCounter(obj.recipe);
            }
            myApp.recipe.management.addRelationWithUser(obj.userId, obj.recipeId);
            myApp.UI.addClass(obj.spanTag, 'js-favorite');
        },
        
        unmarkAsfavorite:function(obj) {
            if(obj.recipe) {
                myApp.recipe.management.decreaseFavoriteCounter(obj.recipe);
            }
            myApp.recipe.management.removeRelationWithUser(obj.userId, obj.recipeId);
            myApp.UI.removeClass(obj.spanTag, 'js-favorite');
        },
        
        showRecipe:function(recipe) {
            console.log("Veo la receta",recipe);
        }
    }
}

myApp.UI = {

    showRecipes: function(datas) {
        var recipes = datas.hits,
            container = document.querySelector('.general-container'),
            recipe = null,
            recipeData = null;
            
        if(myApp.sessionStorage.getUser('user')) {
            myApp.userManagement.favoriteRecipesIdByUser(myApp.sessionStorage.getUser('user')).then(function(favoriteRecipes) {
                for (var i = 0; i < recipes.length; i++) {
                    myApp.UI.recipeComponent(recipes[i].recipe, container, favoriteRecipes);
                }
            });
        }
        else {
            for (var i = 0; i < recipes.length; i++) {
                myApp.UI.recipeComponent(recipes[i].recipe, container);
            }
        }

    },
    
    recipeComponent:function (recipe, container, favoriteRecipes) {
        var recipeData = myApp.tools.getRightUriAndId(recipe.uri);
        container.innerHTML +=
            `<div class="image-container">
                <div class="actions" data-recipeid="${recipe.uri}">
                    <span ${ myApp.tools.isFavorite(favoriteRecipes, recipeData.id)} data-action="favorite">
                        <i class="fas fa-heart"></i>
                    </span>
                    <span data-action="view">
                        <i class="fas fa-eye"></i>
                    </span>
                </div>
                <img src="${recipe.image}"></img>
            <div>`;
    },
    
    addClass:function(tag, cssClass) {
        tag.classList.add(cssClass);
    },
    
    removeClass:function(tag, cssClass) {
        tag.classList.remove(cssClass);
    },
    
    containsClass:function(tag, cssClass) {
        return tag.classList.contains(cssClass);
    },

    eventsListener: function() {
        document.querySelector('.general-container').addEventListener('click', function(e) {
            if (e.target.nodeName === 'I') {
                if(e.target.parentNode.getAttribute('data-action') === 'view') {
                    myApp.recipe.ui.viewAction(e);
                } 
                else {
                    myApp.recipe.ui.favoriteAction(e);
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
            myApp.security.logoutUser();
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
