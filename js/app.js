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
        return new Promise(function(resolve, reject) {
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
        var favoriteRecipes = [],
            recipeCount;
        return new Promise(function(resolve, reject) {
            database.ref('/users-recipes/').orderByChild('userId').equalTo(userId).once('value', function(snapshot) {
                if(snapshot.val()){
                    recipeCount = Object.keys(snapshot.val()).length;
                    snapshot.forEach(function (element) {
                        var recipeRef = database.ref('/recipes/'+element.val().recipeId).once('value', function(snapRecipe) {
                            favoriteRecipes.push(snapRecipe.val());
                            if(favoriteRecipes.length === recipeCount) {
                                resolve(favoriteRecipes)
                            }
                        });
                    });
                }
            })
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
                
                recipe.id = recipeData.id;
                recipe.totalNutrients = {}; //Fix insertion in firebase DB
                if(properties.action === 'favorite') {
                    recipe.favoriteCounter = 1;
                }
                else {
                    properties.callback(recipe);
                    recipe.favoriteCounter = 0;
                }
                myApp.recipe.management.saveRecipe(recipe, false);
                myApp.UI.showHideLoader();
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
        * @name recipeActions
        * @param {Object} event - Evento que es lanzado en la acción de marcar/desmarcar una receta como favorita.
        * @description Se encarga de la delegación de eventos para las acciones del usuario en una receta.
        */
        recipeActions:function (e) {
            if (e.target.nodeName === 'I' && e.target.parentNode.hasAttribute('data-action')) {
                if(e.target.parentNode.getAttribute('data-action') === 'view') {
                    myApp.recipe.ui.viewAction(e);
                } 
                else {
                    myApp.recipe.ui.favoriteAction(e);
                }
            }
        },
        /** @function
        * @name favoriteAction
        * @param {Object} event - Evento que es lanzado en la acción de marcar/desmarcar una receta como favorita.
        * @description Engloba toda la lógica y el comportamiento relacionado con marcar o desmarcar una receta como favorita.
        */
        favoriteAction:function(event) {
            var userId = myApp.sessionStorage.getUser();
            if (userId) {
                var actionsContainerTag = event.path[2],
                    container = event.currentTarget,
                    recipeData = myApp.tools.getRightUriAndId(actionsContainerTag.getAttribute('data-recipe-uri')),
                    recipeId = actionsContainerTag.getAttribute('data-recipe-id'),
                    spanTag = event.target.parentNode;
                    
                
                myApp.tools.cleanQueryParams();        
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
                                if(container.classList.contains('js-favorites-container')) {
                                    myApp.UI.showFavoriteRecipes();
                                }
                            }
                        }
                        else {
                            myApp.UI.showHideLoader();
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
                    recipeData = myApp.tools.getRightUriAndId(actionsContainerTag.getAttribute('data-recipe-uri')),
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
            container = document.querySelector('.js-recipes-container'),
            recipe = null,
            recipeData = null;
        
        myApp.UI.clearFavoritesContainer();
        myApp.UI.clearRecipesContainer();
        if(myApp.sessionStorage.getUser()) {
            myApp.userManagement.favoriteRecipesIdByUser(myApp.sessionStorage.getUser()).then(function(favoriteRecipes) {
                for (var i = 0; i < recipes.length; i++) {
                    recipeData = myApp.tools.getRightUriAndId(recipes[i].recipe.uri);
                    myApp.UI.recipeComponent(recipes[i].recipe, container, myApp.tools.isFavorite(favoriteRecipes, recipeData.id));
                }
                myApp.UI.showHideLoader();
                myApp.UI.moveScroll();
            });
        }
        else {
            for (var i = 0; i < recipes.length; i++) {
                myApp.UI.recipeComponent(recipes[i].recipe, container);
            }
            myApp.UI.moveScroll();
            myApp.UI.showHideLoader();
        }

    },
    
    showFavoriteRecipes:function () {
        var container = document.querySelector('.js-favorites-container');
        myApp.UI.clearRecipesContainer();
        myApp.UI.clearFavoritesContainer();
        myApp.userManagement.favoriteRecipesByUser(myApp.sessionStorage.getUser()).then(function (favoriteRecipes) {
            favoriteRecipes.forEach(function (element) {
                myApp.UI.recipeComponent(element,container, true);
            });
            myApp.UI.moveScroll();
        });
    },
    
    /** @function
    * @name recipeComponent
    * @param {Object} recipe - Receta que será creada.
    * @param {Object} container - Etiqueta HTML donde será insertada la tarjeta que muestra los datos de la receta.
    * @param {Boolean} isFavorite - True o false en dependencia si la receta es favorita para el usuario logueado.
    * @description Crea la tarjeta que muestra los datos de la receta y la inserta en su contenedor.
    */
    recipeComponent:function (recipe, container, isFavorite) {
        var recipeData = myApp.tools.getRightUriAndId(recipe.uri),
            cssClass = '';
        
        if (isFavorite) {
            cssClass = 'js-favorite';
        }
        container.innerHTML +=
            `<div class="recipe-card">
                <img class="recipe-card__image" src="${recipe.image}">
                <div class="recipe-card__name-wrapper">
                    <p class="recipe-card__name">
                        ${recipe.label}
                    </p>
                </div>
                <div class="recipe-card__actions-wrapper">
                    <div class="recipe-card__actions" data-recipe-id="${recipeData.id}" data-recipe-uri="${recipe.uri}">
                        <a href="${recipe.url}" target="_blank">
                            <i class="fas fa-link"></i>
                        </a>
                        <span class='${cssClass}' data-action="favorite">
                            <i class="fas fa-heart"></i>
                        </span>
                        <span data-action="view">
                            <i class="fas fa-list-ul"></i>
                        </span>
                    </div>
                </div>
            </div>`;
    },
    
    /** @function
    * @name createLogginArea
    * @description Crea el area que contiene los botones del login social y el comportamiento de estos.
    */
    createLogginArea: function () {
        var authArea = document.querySelector('.authentication-area');
        authArea.innerHTML = '';  
        authArea.innerHTML = 
            `<div class="authentication-area__login">
                <div class="js-loginGithub github-button authentication-area__btn" title="Registrarse con Github">
                    <span><i class="fab fa-github"></i></span><span>Github</span>
                </div>
                <div class="js-loginGoogle google-button authentication-area__btn" title="Registrarse con Google">
                    <span><i class="fab fa-google"></i></span><span>Google</span>
                </div>
            </div>`;
            
        document.querySelector('.js-loginGithub').addEventListener('click', function() {
            myApp.security.loginGithub();
        });

        document.querySelector('.js-loginGoogle').addEventListener('click', function() {
            myApp.security.loginGoogle();
        });
    },
    
    /** @function
    * @name createUserArea
    * @description Crea el area del usuario cuando está logueado y el comportamiento de estos.
    */
    createUserArea: function (user) {
        var authArea = document.querySelector('.authentication-area');
        authArea.innerHTML = ''; 
        authArea.innerHTML = 
            `<div class="authentication-area__user">
                <img class="authentication-area__avatar" src="${user.photoURL}"></img>
                <div class="js-favorites-list-btn authentication-area__btn"  title="Lista tus recetas favoritas">
                    <span><i class="fas fa-heart"></i></span><span>Tus recetas</span>
                </div>
                <div class="js-logout logout-button authentication-area__btn">
                    <span title="Cerrar sessión"><i class="fas fa-sign-out-alt"></i></span>
                </div>
            </div>`;
            
        document.querySelector('.js-logout').addEventListener('click', function() {
            myApp.security.logoutUser();
        });
        
        document.querySelector('.js-favorites-list-btn').addEventListener('click', function(e) {
            myApp.UI.showFavoriteRecipes();
        });
    },

    moveScroll: function (speed = 50, destination = myApp.UI.getRecipeContainerPosition()) {
        var origin = window.scrollY,
            distance = Math.abs(origin - destination),
            step = Math.round(distance*speed/1000),
            destinationStep,
            counter = 0;
        
        var interval = window.setInterval(function () {
            if(counter <= distance) {
                
                if(origin > destination) {
                    destinationStep = window.scrollY - step;
                } 
                else {
                    destinationStep = window.scrollY + step;
                }
                window.scrollTo(0, destinationStep);
                counter+=step;
            }
            else {
                clearInterval(interval);
            }
        }, speed)
    },
    
    getRecipeContainerPosition: function (argument) {
        var scroll = document.querySelector('.search').scrollHeight;
        var headerHeight = document.querySelector('header').offsetHeight;
        return scroll-headerHeight;
    },
    
    clearRecipesContainer: function () {
        var container = document.querySelector('.js-recipes-container'); 
        container.innerHTML = '';
    },
    
    clearFavoritesContainer: function () {
        var container = document.querySelector('.js-favorites-container'); 
        container.innerHTML = '';
    },
    
    unmarkAsfavoriteAllRecipes: function () {
        var container = document.querySelector('.js-recipes-container'); 
        if (container.hasChildNodes()) {
            var favoriteRecipes = container.querySelectorAll('.js-favorite');
            for(var i = 0; i < favoriteRecipes.length; i++) {
                favoriteRecipes[i].classList.remove('js-favorite');
            }
        }
    },
    
    showHideLoader: function () {
        var loader = document.querySelector('.loader-wrapper');
        loader.classList.toggle('hidden');
    },
    
    triggerNotification:function (type, text, time) {
        var notifications = document.querySelector('.notification-wrapper');
        notifications.innerHTML = `<div class="notification notification--${type}">
            <p>${text}</p>
        </div>`;
        
        window.setTimeout(function () {
            notifications.childNodes[0].classList.add('notification--in');
        },500, notifications);
        
        window.setTimeout(function () {
            notifications.childNodes[0].classList.add('notification--out');
        }, time, notifications);
        
        window.setTimeout(function () {
            notifications.innerHTML = '';
        }, time +500, notifications)
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
        document.querySelector('.js-recipes-container').addEventListener('click', function(e) {
            myApp.recipe.ui.recipeActions(e);
        });
        
        document.querySelector('.js-favorites-container').addEventListener('click', function(e) {
            myApp.recipe.ui.recipeActions(e);
        });

        document.querySelector('.js-search').addEventListener('keyup', function(e) {
            if (e.keyCode === 13) {
                if (this.value) {
                    myApp.queryParams.q = this.value;
                    myApp.queryParams.from = 0;
                    myApp.queryParams.to = 30;
                    myApp.UI.showHideLoader();
                    myApp.tools.makeAjaxRequest('GET', myApp.tools.createUrl(myApp.queryParams), myApp.UI.showRecipes);
                    // myApp.tools.makeAjaxRequest('GET', '../localDatas/recipes.json', myApp.UI.showRecipes);
                } else {
                    myApp.UI.triggerNotification('info','Debe introducir el nombre de un ingrediente para realizar la búsqueda',3000);                  
                }
            }
        });

    }
}

myApp.start = function() {
    myApp.UI.eventsListener()
}
myApp.start();


/*TODO*/
/*
Cuando el usuario ha listado sus favoritas, y se desloguea, borrar la lista de favoritos
Cuando el usuario se desloguea, quitar el favorito a todas sus recetas
Actualizar listado de favoritos cuando el usuario desmarca como favorito uno de sus favoritos
Loader gif
Scroll con animación
Componente de notificación

Validar barra de búsqueda y borrar el texto una vez realizada la busqueda.
Informar cdo no se han encontrado recetas con la búsqueda
Informar cdo el usuario quiere marcar como favorito pero no está logueado
Borrar console.log
Mostrar ingredientes de la receta
Mostrar cantidad de veces que la receta es marcada como favorita
Si ya hay una busqueda realizada y el usuario se loguea, marcar las recetas favoritas del usuario
*/