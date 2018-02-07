var myApp = myApp || {};

/*** TOOLS ***/

myApp.tools = {
    
    makeAjaxRequest: function (httpMethod, url, callback) {
        var request = new XMLHttpRequest();
        request.open(httpMethod,url, true);
        
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200 && request.responseText ) {
                var json = JSON.parse(request.responseText);
                callback(json);
                return true;
            }else{
                return false;
            }
        };
        request.send(null);
    },
    
    createUrl: function (queryParams) {
        var url = 'https://api.edamam.com/search?';
        
        for (var key in queryParams) {
            if(queryParams[key]){
                url += key + '=' + queryParams[key] + '&';
            }
        }
        return url.slice(0,url.length-1)
    },
    
    getRightUri: function (uri) {
        if(uri.indexOf('#') !== -1){
            uri = uri.replace('#', '%23');
        }
        return uri;
    },
    
    extractRecipesIdFromUri: function (uri) {
        if(uri.indexOf('#') !== -1){
            return uri.match(/#([^#]*.)/)[1];
        }
    }
}