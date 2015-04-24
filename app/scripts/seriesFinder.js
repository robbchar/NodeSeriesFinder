'use strict';
angular.module('seriesFinder', ['ngAnimate', 'ngCookies', 'ngTouch', 'ngSanitize', 'ngResource', 'ngRoute']).config(function($routeProvider, $httpProvider) {
    $routeProvider.when('/', {
        templateUrl: 'partials/home.html',
        controller: 'HomeCtrl'
    }).when('/Books', {
        templateUrl: 'partials/books.html',
        controller: 'BooksCtrl'
    }).when('/Series', {
        templateUrl: 'partials/series.html',
        controller: 'SeriesCtrl'
    }).when('/login', {
        templateUrl: 'partials/login.html',
        controller: 'LoginCtrl'
    }).otherwise({
        redirectTo: '/'
    });
})
.run(['$rootScope', '$injector',
    function($rootScope, $injector) {
    }
]);
