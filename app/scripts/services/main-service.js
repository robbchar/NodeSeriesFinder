
angular.module('seriesFinder')
.service('MainService', function ($rootScope, $http, $cookies) {
  var isLoggedIn,
    user = {},
    books = [];

    function init() {
    }

    function getIsLoggedIn () {
      var that = this;

      $http.get('/isLoggedIn')
      .success(function(data, status, headers, config) {
        that.IsLoggedIn = data.isLoggedIn;
        $rootScope.$broadcast('MainDataChange');
      }).
      error(function(data, status, headers, config) {
        console.log('error in isLoggedIn');
      });

    }

    function getUserInfo () {
      var that = this;

      $http.get('/userInfo')
      .success(function(data, status, headers, config) {
        that.User = data.user[0];
        $rootScope.$broadcast('MainDataChange');
      }).
      error(function(data, status, headers, config) {
        console.log('error in getUserInfo');
      });
    }

    function getBooks () {
      var that = this;

      $http.get('/shelfInfo?pageNum=1&shelfName=read')
      .success(function(data, status, headers, config) {
        $rootScope.$broadcast('ShelfDataChange', data);
      }).
      error(function(data, status, headers, config) {
        console.log('error in getBookInfo');
      });
    }

    function getBookInfo () {
      var that = this;

      $http.get('/bookInfo')
      .success(function(data, status, headers, config) {
        $rootScope.$broadcast('BookDataChange', data);
      }).
      error(function(data, status, headers, config) {
        console.log('error in getBookInfo');
      });
    }

    init();
  return {
    IsLoggedIn: isLoggedIn,
    User: user,
    GetUserInfo: getUserInfo,
    GetIsLoggedIn: getIsLoggedIn,
    Books: books,
    GetBooks: getBooks
  };
});
