(function (angular) {
    var app = angular.module('A11TemplateV1Config', ['ghiscoding.validation', 'pascalprecht.translate', 'ngSanitize',
                                                'angular-loading-bar','toaster','ngAnimate']);
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
    //Config loading bar
    app.config(['cfpLoadingBarProvider', function (cfpLoadingBarProvider) {
        cfpLoadingBarProvider.includeSpinner = true;
        cfpLoadingBarProvider.includeBar = true;
        cfpLoadingBarProvider.latencyThreshold = 500;
    }])
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
})(window.angular);