var myApp = myApp || {};

/*** TOOLS ***/

myApp.tools = {
    
    /** @function
    * @name makeAjaxRequest
    * @param {string} httpMethod - Metodo HTTP.
    * @param {string} url - Endpoint de la APi.
    * @param {requestCallback} callback - Función callback de la petición
    * @param {Object} proporties - Parametro opcional para la función callback, contiene propiedades extras
    * @param {string} proporties.action - La acción de origen desde donde se realiza la petición AJAX. Posibles valores: 'favorite' o 'view' 
    * @param {requestCallback} proporties.callback - Función callback interna que depende si properties.action == 'view'
    * @description Realiza una llamada AJAX.
    */
    makeAjaxRequest: function (httpMethod, url, callback, proporties) {
        var request = new XMLHttpRequest();
        request.open(httpMethod,url, true);
        
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200 && request.responseText ) {
                var json = JSON.parse(request.responseText);
                callback(json, proporties);
                return true;
            }else{
                return false;
            }
        };
        request.send(null);
    },
    
    /** @function
    * @name purifyObject
    * @param {Object} obj - Instancia "CurrentUser" que representa el usuario que está logueado en Firebase.
    * @description Limpia el objeto "CurrentUser" que posee propiedades que impiden guardarlo en una base de datos de firebase.
    * @return {Object}
    */
    purifyObject: function (obj) {
        obj = JSON.stringify(obj);
        return JSON.parse(obj);
    },

    /** @function
    * @name createUrl
    * @param {Object} queryParams - Parametros de la URL en las llamadas AJAX a la API.
    * @param {string} queryParams.app_id - Id de la aplicación.
    * @param {string} queryParams.app_key - Key de la aplicación.
    * @param {string} queryParams.q - Ingrediente, permite buscar las recetas que contengan el ingrediente dado.
    * @param {string} queryParams.r - Identificador de una receta, especie de URL que permite buscar una receta específica en la API.
    * @param {number} queryParams.from - Límite inferior para hacer paginado en el listado de recetas disponibles.
    * @param {number} queryParams.to - Límite superior para hacer paginado en el listado de recetas disponibles.
    * @description Inserta parametros opcionales o no, a la URL de la API
    * @return {string} URL definitiva que será utilizada en la llamada AJAX a la API
    */
    createUrl: function (queryParams) {
        var url = 'https://api.edamam.com/search?';
        
        for (var key in queryParams) {
            if(queryParams[key]){
                url += key + '=' + queryParams[key] + '&';
            }
        }
        return url.slice(0,url.length-1)
    },
    
    /** @function
    * @name getRightUriAndId
    * @param {string} uri - Identificador de una receta, especie de URL que permite buscar una receta específica en la API.
    * @description Formatea la uri de una receta y extrae información de valor de la misma
    * @return {Object} Objeto que contiene el id de la receta y la uri válida para realizar la petición AJAX a la API 
    */
    getRightUriAndId: function (uri) {
        if(uri.indexOf('#') !== -1){
            var object = {
                id: uri.match(/#([^#]*.)/)[1],
                uri: uri.replace('#', '%23')
            } 
        }
        return object;
    },
    
    /** @function
    * @name cleanQueryParams
    * @description Hace null todos las propiedades del objeto "queryParams" excepto "app_id" y "app_key"
    */
    cleanQueryParams: function (){
        for (var prop in myApp.queryParams) {
            if (prop !== 'app_id' && prop !== 'app_key') {
                myApp.queryParams[prop] = null;
            }
        }
    },
    
    /** @function
    * @name isFavorite
    * @param {array} favoriteRecipes - Listado de las recetas favoritas de un usuario determinado.
    * @param {string} recipeId - Id de una receta específica.
    * @description Verifica si una receta está en el listado de recetas favoritas de un usuario.
    * @return Devuelve un texto que contiene la clase CSS que indica visualmente si una receta favorita del usuario.
    */
    isFavorite: function(favoriteRecipes, recipeId ) {
        if(favoriteRecipes && favoriteRecipes.length !== 0 && favoriteRecipes.indexOf(recipeId) !== -1) {
            return "class='js-favorite'";
        }
    }
}