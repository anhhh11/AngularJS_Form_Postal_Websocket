(function (angular) {
    var app = angular.module('A11TemplateGlobalLib', []);
    app.service('R', ['$window', function ($window) {
        return $window.R;
    }]);
    app.service('RF', ['$window', function ($window) {
        return $window.RF;
    }]);
    app.service('postal', ['$window', function ($window) {
        return $window.postal;
    }]);
})(window.angular);