'use strict';
angular.module('seriesFinder')
.controller('MainCtrl', function($scope, MainService) {
    $scope.isLoggedIn = false;
    $scope.user;

    MainService.GetUserInfo();
    MainService.GetIsLoggedIn();

    $scope.$on('MainDataChange', function() {
        $scope.isLoggedIn = MainService.IsLoggedIn;
        $scope.user = MainService.User;
    });
});