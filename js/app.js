/*global auth*/
/*global database*/
/** @global */
var myApp = myApp || {};

/** @global */
myApp.queryParams = {
    app_id: myApp.config.appId,
    app_key: myApp.config.appKey,
    q: null,
    r: null,
    from: null,
    to: null
}

myApp.sessionStorage = {
    /** @function
    * @name storageUser
    * @param {string} user - Id del usuario logueado.
    * @description Almacena en el sessionStorage el Id del usurio, permitiendo verificar si el usuario esta logueado o no, y obtener su id.
    */
    storageUser: function(user) {
        if (!myApp.sessionStorage.getUser()) {
            sessionStorage.setItem('user', user);
        }
    },

    /** @function
    * @name removeUser
    * @description Borra el usuario del sessionStorage.
    */
    removeUser: function() {
        sessionStorage.removeItem('user');
    },

    /** @function
    * @name getUser
    * @description Recupera el id del usuario almacenado en el sessionStorage
    */
    getUser: function() {
        return sessionStorage.getItem('user');
    }

}

myApp.userManagement = {

    /** @function
    * @name saveUser
    * @param {Object} user - Usuario logueado 
    * @description Almacena un usuario en la base de datos
    */
    saveUser: function(user) {
        myApp.userManagement.userAlreadyExist(user.uid).then(function (exist) {
            if(exist === false) {
                database.ref('/users/' + user.uid).set(myApp.tools.purifyObject(user));
            } 
        });
    },

    /** @function
    * @name userAlreadyExist
    * @param {string} userId - Id de un usuario 
    * @description Verifica si el usuario ya existe en la base de datos
    * @return {Promise} Devuelve una promesa, si la promesa se resuelve, esta devolverá el usuario si este existe o false si no existe.
    */
    userAlreadyExist: function(userId) {
        return new Promise(function(resolve, reject) {
            database.ref('/users/' + userId).once('value').then(function(snapshot) {
                snapshot.val() ? resolve(snapshot.val()) : resolve(false);
            });
        });
    },
    
    /** @function
    * @name favoriteRecipesIdByUser
    * @param {string} userId - Id de un usuario 
    * @description Busca en el nodo "/users-recipes/" todos los hijos que coinciden 
    * con el Id del usuario y guarda los id de las recetas asociadas al usurio en un array
    * @return {Promise} Devuelve una promesa y si ésta se resuelve, devolverá un listado con el Id de las recetas favoritas del usuario.
    */
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
    
    /** @function
    * @name favoriteRecipesByUser
    * @param {string} userId - Id de un usuario 
    * @description Busca en el nodo "/users-recipes/" todos los hijos que coinciden 
    * con el Id del usuario y luego busca en nodo "/recipes/" todas las recetas 
    * recetas asociadas al usurio y las guarda en un array.
    * @return {Promise} Devuelve una promesa y si ésta se resuelve, devolverá un listado con las recetas favoritas del usuario.
    */
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
        /** @function
        * @name saveRecipe
        * @param {Object} recipe - Una receta 
        * @param {Boolean} verify - Define si se tiene que verificar si la receta ya existe en la base de datos. 
        * @description Almacena una receta en la base de datos
        */
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
        
        /** @function
        * @name updateRecipe
        * @param {Object} recipe - Una receta 
        * @description Actualiza los valores de una receta en la base de datos
        */
        updateRecipe: function(recipe) {
            database.ref('/recipes/' + recipe.id).update(recipe);
        },
    
        /** @function
        * @name recipeAlreadyExist
        * @param {string} recipeId - Id de una receta 
        * @description Verifica si la receta ya existe en la base de datos
        * @return {Promise} Devuelve una promesa, si la promesa se resuelve, esta devolverá la receta si existe o false si no.
        */
        recipeAlreadyExist: function(recipeId) {
            return new Promise(function(resolve, reject) {
                database.ref('/recipes/' + recipeId).once('value').then(function(snapshot) {
                    snapshot.val() ? resolve(snapshot.val()) : resolve(false);
                });
            });
        },
    
        /** @callback
        * @name saveRecipeFromAPI
        * @param {Object} json - Objeto que contiene los datos de una receta extraida de la base de datos 
        * @param {Object} proporties - Parametro opcional para la función callback, contiene propiedades extras
        * @param {string} proporties.action - La acción de origen desde donde se realiza la petición AJAX. Posibles valores: 'favorite' o 'view' 
        * @param {requestCallback} proporties.callback - Función callback interna que depende si properties.action == 'view' 
        * @description Almacena en la base de datos una receta proveniendte 
        * de la API, previamente se le insertan a la receta algunas propiedades extras
        */
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
        
        /** @function
        * @name addRelationWithUser
        * @param {string} userId - Id de un usuario
        * @param {string} recipeId - Id de una receta 
        * @description Crea en la base de datos una relación entre un usuario y una receta, 
        * en el nodo "/users-recipes/" el cual permite establecer la relación 
        * de muchos a muchos entre dichas instancias
        */
        addRelationWithUser: function(userId, recipeId) {
            database.ref('/users-recipes/' + userId + '_' + recipeId).set({
                userId: userId,
                recipeId: recipeId
            });
        },
        
        /** @function
        * @name removeRelationWithUser
        * @param {string} userId - Id de un usuario
        * @param {string} recipeId - Id de una receta 
        * @description Elimina en la base de datos la relación entre un usuario y una receta.
        */
        removeRelationWithUser: function(userId, recipeId) {
            database.ref('/users-recipes/' + userId + '_' + recipeId).remove();
        },
        
        /** @function
        * @name recipeMoreFavorites
        * @param {number} amount - Cantidad de recetas favoritas que seran devueltas.
        * @description Ordena descendentemente y devuelve las recetas que han sido marcada más veces como favoritas.
        */
        recipeMoreFavorites: function(amount) {
            database.ref('/recipes/').orderByChild('favoriteCounter').limitToLast(amount).once('value',function (snapshot) {
                console.log(snapshot.val())
            });
        },
        
        /** @function
        * @name increaseFavoriteCounter
        * @param {Object} recipe - Receta que será modificada.
        * @description Incrementa el contador de marcada como favorita.
        */
        increaseFavoriteCounter:function(recipe) {
            recipe.favoriteCounter += 1;
            myApp.recipe.management.updateRecipe(recipe);
        },
        
        /** @function
        * @name decreaseFavoriteCounter
        * @param {Object} recipe - Receta que será modificada.
        * @description Decrementa el contador de marcada como favorita.
        */
        decreaseFavoriteCounter:function(recipe) {
            if(recipe.favoriteCounter >= 1) {
                recipe.favoriteCounter -= 1;
            }
            myApp.recipe.management.updateRecipe(recipe);
        }
    },
    
    ui: {
        /** @function
        * @name favoriteAction
        * @param {Object} event - Evento que es lanzado en la acción de marcar/desmarcar una receta como favorita.
        * @description Engloba toda la lógica y el comportamiento relacionado con marcar o desmarcar una receta como favorita.
        */
        favoriteAction:function(event) {
            var userId = myApp.sessionStorage.getUser();
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
        
        /** @function
        * @name viewAction
        * @param {Object} event - Evento que es lanzado en la acción de visualizar una receta.
        * @description Engloba toda la lógica y el comportamiento relacionado con visualizar una receta.
        */
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
        
        /** @function
        * @name markAsfavorite
        * @param {Object} obj - Objeto de propiedades que incluye la receta que sera marcada como favorita.
        * @description Engloba toda la lógica específica con marcar una receta como favorita.
        */
        markAsfavorite:function(obj) {
            if(obj.recipe) {
                myApp.recipe.management.increaseFavoriteCounter(obj.recipe);
            }
            myApp.recipe.management.addRelationWithUser(obj.userId, obj.recipeId);
            myApp.UI.addClass(obj.spanTag, 'js-favorite');
        },
        
        /** @function
        * @name markAsfavorite
        * @param {Object} obj - Objeto de propiedades que incluye la receta que sera desmarcada como favorita.
        * @description Engloba toda la lógica específica con desmarcar una receta como favorita.
        */
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

    /** @function
    * @name showRecipes
    * @param {array} datas - Listado de recetas.
    * @description Muestra las recetas provenientes de la API.
    */
    showRecipes: function(datas) {
        var recipes = datas.hits,
            container = document.querySelector('.general-container'),
            recipe = null,
            recipeData = null;
            
        if(myApp.sessionStorage.getUser('user')) {
            myApp.userManagement.favoriteRecipesIdByUser(myApp.sessionStorage.getUser()).then(function(favoriteRecipes) {
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
    
    /** @function
    * @name recipeComponent
    * @param {Object} recipe - Receta que será creada.
    * @param {Object} container - Etiqueta HTML donde será insertada la tarjeta que muestra los datos de la receta.
    * @param {array} favoriteRecipes - Listado de las recetas favoritas del usuario logueado.
    * @description Crea la tarjeta que muestra los datos de la receta y la inserta en su contenedor.
    */
    recipeComponent:function (recipe, container, favoriteRecipes) {
        var recipeData = myApp.tools.getRightUriAndId(recipe.uri);
        container.innerHTML +=
            `<div class="recipe-card">
                <img class="recipe-card__image" src="${recipe.image}">
                <div class="recipe-card__name-wrapper">
                    <p class="recipe-card__name">
                        ${recipe.label}
                    </p>
                </div>
                <div class="recipe-card__actions" data-recipeid="${recipe.uri}">
                    <span ${ myApp.tools.isFavorite(favoriteRecipes, recipeData.id)} data-action="favorite">
                        <i class="fas fa-heart"></i>
                    </span>
                    <a href="${recipe.url}" target="_blank">
                        <i class="fas fa-link"></i>
                    </a>
                    <span data-action="view">
                        <i class="fas fa-list-ul"></i>
                    </span>
                </div>
            </div>`;
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
            if (e.target.nodeName === 'I' && e.target.parentNode.hasAttribute('data-action')) {
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
*/
