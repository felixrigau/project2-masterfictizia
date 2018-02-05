var myApp = myApp || {};

var url = `https://api.edamam.com/search?q=chicken&app_id=${myApp.config.appId}&app_key=${myApp.config.appKey}&from=0&to=1`;
 
document.querySelector('.general-container').addEventListener('click',function () {
    myApp.tools.makeAjaxRequest('GET', '../localDatas/recipes.json', true, function (data) {
        console.log(data);
    });
})