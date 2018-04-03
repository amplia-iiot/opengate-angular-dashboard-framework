/*
 * The MIT License
 *
 * Copyright (c) 2015, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

angular.module('adf')
    .directive('adfWidgetContent', function($log, $q, widgetService,
        $compile, $controller, $injector, dashboard, $translate) {

        function renderError($element, msg) {
            $log.warn(msg);
            $element.html(dashboard.messageTemplate.replace(/{}/g, msg));
        }

        function compileWidget($scope, $element, currentScope, configChanged) {
            var model = $scope.model;
            var content = $scope.content;

            var extra = $scope.extra;

            var newScope = currentScope;
            if (!model) {
                $translate('ADF.ERROR.MODEL_IS_UNDEFINED').then(function(translateMessage) {
                    renderError($element, translateMessage);
                });
            } else if (!content) {
                if (model.title) {
                    $translate('ADF.ERROR.WIDGET_FOR_DEPRECTATED', {
                        title: model.title
                    }).then(function(translateMessage) {
                        renderError($element, translateMessage);
                    });
                } else {
                    $translate('ADF.ERROR.WIDGET_DEPRECTATED').then(function(translateMessage) {
                        renderError($element, translateMessage);
                    });
                }
            } else {
                if (newScope) {
                    var is_menu = newScope.menu !== undefined && newScope.menu !== null && (!newScope.isPaginationEnable || !newScope.isPaginationEnable());
                    var is_itemsPerPage = newScope.itemsPerPage !== undefined && newScope.itemsPerPage !== null;
                    if (is_menu || is_itemsPerPage || configChanged || !angular.isFunction(newScope.reloadData)) {
                        newScope = renderWidget($scope, $element, currentScope, model, content, extra);
                    } else {
                        newScope.reloadData();
                    }
                } else {
                    newScope = renderWidget($scope, $element, currentScope, model, content, extra);
                }
            }

            function _getWindowTime(type) {
                if (type === "custom") {
                    return {
                        from: newScope.config.windowFilter.from,
                        to: newScope.config.windowFilter.to
                    }
                }
                var from = window.moment().subtract(1, type);
                return {
                    from: from._d
                };
            }

            if (newScope) {
                if (newScope.config) {
                    newScope.config.getWindowTime = function() {
                        var windowFilter = newScope.config.windowFilter;
                        if (windowFilter && windowFilter.type) {
                            var winTime = _getWindowTime(windowFilter.type);
                            /* jshint ignore:start */
                            if (!window.eval(newScope.config.windowFilter.rawdate)) {
                                for (var key in winTime) {
                                    winTime[key] = window.moment(winTime[key]).format();
                                }
                                winTime['rawdate'] = true;
                            }
                            /* jshint ignore:end */
                            return winTime;
                        }
                    }
                }

                if (extra) {
                    newScope.editing = extra.editing ? true : false;
                    newScope.extraData = extra;
                }
            }
            return newScope;
        }

        function renderWidget($scope, $element, currentScope, model, content, extra) {
            // display loading template
            $element.html(dashboard.loadingTemplate);

            // create new scope
            var templateScope = $scope.$new();

            // pass config object to scope
            if (!model.config) {
                model.config = {};
            }

            templateScope.config = model.config;
            templateScope.editing = extra && extra.editing;

            if (extra) {
                templateScope.extra = extra;
            }

            templateScope.selectionManager = (currentScope && currentScope.selectionManager) ? currentScope.selectionManager : undefined;

            // local injections
            var base = {
                $scope: templateScope,
                widget: model,
                config: model.config
            };

            // get resolve promises from content object
            var resolvers = {};
            resolvers.$tpl = widgetService.getTemplate(content);
            if (content.resolve) {
                angular.forEach(content.resolve, function(promise, key) {
                    if (angular.isString(promise)) {
                        resolvers[key] = $injector.get(promise);
                    } else {
                        resolvers[key] = $injector.invoke(promise, promise, base);
                    }
                });
            }

            // resolve all resolvers
            $q.all(resolvers).then(function(locals) {
                angular.extend(locals, base);

                // pass resolve map to template scope as defined in resolveAs
                if (content.resolveAs) {
                    templateScope[content.resolveAs] = locals;
                }

                // compile & render template
                var template = locals.$tpl;
                $element.html(template);
                if (content.controller) {
                    var templateCtrl = $controller(content.controller, locals);
                    if (content.controllerAs) {
                        templateScope[content.controllerAs] = templateCtrl;
                    }
                    $element.children().data('$ngControllerController', templateCtrl);
                }
                $compile($element.contents())(templateScope);
            }, function(reason) {
                // handle promise rejection
                var msg = 'ADF.ERROR.COULD_NOT_RESOLVE_ALL_PROMISSES';
                $translate(msg, {
                    reason: (reason ? ": " + reason : reason)
                }).then(function(translateMessage) {
                    renderError($element, translateMessage);
                });
            });

            // destroy old scope
            if (currentScope) {
                currentScope.$destroy();
            }

            return templateScope;
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            scope: {
                model: '=',
                content: '=',
                extra: '='
            },
            link: function($scope, $element) {
                var currentScope = compileWidget($scope, $element, null);
                var widgetConfigChangedEvt = $scope.$on('widgetConfigChanged', function() {
                    currentScope = compileWidget($scope, $element, currentScope, true);
                });

                var widgetReloadEvt = $scope.$on('widgetReload', function() {
                    currentScope = compileWidget($scope, $element, currentScope, false);
                });

                $scope.$on('destroy', function() {
                    widgetConfigChangedEvt();
                    widgetReloadEvt();
                });
            }
        };
    });