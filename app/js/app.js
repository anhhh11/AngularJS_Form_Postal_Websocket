'use strict';
(function init(angular) {
    var app = angular.module('A11TemplateV1', ['A11TemplateV1Config', 'A11TemplateGlobalLib', 'tryPostal']);
    app.controller('MainCtrl', ['$scope', 'toaster', function ($scope, toaster) {
        $scope.toastSuccess = function () {
            toaster.pop({
                type: 'error',
                body: 'try-postal',
                bodyOutputType: 'directive',
            });
        };
    }]);
})(window.angular);