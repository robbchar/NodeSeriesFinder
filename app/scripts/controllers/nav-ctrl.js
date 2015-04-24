'use strict';

angular.module('seriesFinder')
.controller('NavCtrl', function ($scope, $rootScope, $route) {
  $scope.currentPage = '#';

  $rootScope.$on('$locationChangeSuccess', function(event, currentPage, previousPage){
  	if(typeof $route.current.originalPath !== 'undefined') {
	    $scope.currentPage = $route.current.originalPath.toLowerCase();
	}
  });
});
