'use strict';

angular.module('seriesFinder')
.controller('BooksCtrl', function ($scope, MainService) {
  $scope.books = [];

  MainService.GetBooks();

  $scope.$on('BookDataChange', function(event, bookData) {
  	$scope.books = MainService.Books;
  });

  $scope.$on('ShelfDataChange', function(event, shelfdata) {
  	$scope.books = MainService.Books;
  });
});
