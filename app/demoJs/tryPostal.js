(function (angular) {
    var app = angular.module('tryPostal', ['A11TemplateGlobalLib']);
    app.controller('tp.PostalPostCtrl', [
        '$scope', 'NormalSharedService', function ($scope, SharedService) {
            $scope.data = SharedService.data;
            var x = $scope.$bus.channel('x');
            $scope.submit = function () {
                x.publish({
                    topic: 'y',
                    data: { count: 1 }
                });
            };
        }
    ]);
    app.controller('tp.PostalSubscribeCtrl', [
        '$scope', 'NormalSharedService', function ($scope, SharedService) {
            $scope.data = SharedService.data;
            var x = $scope.$bus.channel('x');
            x.subscribe('y', function (data) {
                console.log(data);
            });
        }
    ]);
    app.factory('NormalSharedService', function () {
        return {
            data: {
                x: 1
            }
        };
    });

    app.filter('jsonCherry', ['R', 'RF', '$window', function (R, RF, $window) {
        return function (obj) {
            // dissocProps :: [String] 
            var dissocProps = R.drop(1, [].slice.call(arguments));
            var ret = R.reduce(function (acc, item) { return R.dissoc(item, acc); }, obj, dissocProps);
            return $window.JSON.stringify(ret, null, '    ');

        }
    }]);
    app.directive('tryPostal', function () {
        return {
            restrict: 'EA',
            templateUrl: '/app/demoJs/tryPostal.tpl.html',

        }
    })
})(window.angular)