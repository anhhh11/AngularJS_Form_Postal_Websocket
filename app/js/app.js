'use strict';
(function init(angular) {
    var app = angular.module('A11TemplateV1', ['ghiscoding.validation', 'pascalprecht.translate', 'ngSanitize']);
    //Config i18n
    app.config(function ($translateProvider) {
        $translateProvider.useStaticFilesLoader({
            prefix: 'bower_components/angular-validation-ghiscoding/locales/validation/',
            suffix: '.json'
        });
        // define translation maps you want to use on startup
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy('sanitize');
    });
    //Config PostalJS
    app.config(['$provide', function ($provide) {
        $provide.decorator('$rootScope', ['$delegate', function ($delegate) {
            Object.defineProperty($delegate.constructor.prototype, '$bus', {
                get: function () {
                    var self = this;
                    return {
                        subscribe: function () {
                            var sub = postal.subscribe.apply(postal, arguments);
                            self.$on('$destroy',
                            function () {
                                sub.unsubscribe();
                            });
                        },
                        channel: postal.channel.bind(postal),
                        publish: postal.publish.bind(postal)
                    };
                },
                enumerable: false
            });

            return $delegate;
        }]);
    }]);

    app.controller('MainCtrl', [
        '$scope', function ($scope) {
            var x = $scope.$bus.channel('x');
            $scope.submit = function () {
                console.log('click');
                x.publish({
                    topic: 'y',
                    data: {count: 1}
                });
            };
        }
    ]);
    app.controller('SecondCtrl', [
        '$scope', function ($scope) {
            var x = $scope.$bus.channel('x');
            x.subscribe('y', function (data) {
                console.log(data);
            });
        }
    ]);

    app.filter('jsonCherry', ['R', 'RF', '$window', function (R, RF, $window) {
        return function (obj) {
            // dissocProps :: [String] 
            var dissocProps = R.drop(1, [].slice.call(arguments));
            var ret = R.reduce(function (acc, item) { return R.dissoc(item, acc); }, obj, dissocProps);
            return $window.JSON.stringify(ret, null, '    ');

        }
    }]);
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