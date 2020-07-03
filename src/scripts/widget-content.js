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
            if (!model) {
                $translate('ADF.ERROR.MODEL_IS_UNDEFINED').then(function(translateMessage) {
                    renderError($element, translateMessage);
                });
                return currentScope;
            }

            var content = $scope.content;

            if (!content) {
                $translate('ADF.ERROR.WIDGET_FOR_DEPRECTATED', {
                    title: model.title
                }).then(function(translateMessage) {
                    renderError($element, translateMessage);
                });
                return currentScope;
            }

            var extra = $scope.extra;
            var newScope = currentScope;

            if (newScope) {
                var is_menu = newScope.menu !== undefined && newScope.menu !== null && (!newScope.isPaginationEnable || !newScope.isPaginationEnable());
                if (is_menu || configChanged || !angular.isFunction(newScope.reloadData)) {
                    if ($scope.navOptionsHandler) {
                        $scope.navOptionsHandler.firstLoad = true;
                    }
                    newScope = renderWidget($scope, $element, currentScope, model, content, extra);
                } else {
                    var is_itemsPerPage = newScope.itemsPerPage !== undefined && newScope.itemsPerPage !== null;
                    if (is_itemsPerPage || newScope.page) {
                        newScope.page = 1;
                    }
                    newScope.reloadData();
                }
            } else {
                if ($scope.navOptionsHandler) {
                    $scope.navOptionsHandler.firstLoad = true;
                }

                newScope = renderWidget($scope, $element, currentScope, model, content, extra);
            }

            function _getWindowTime(type) {
                switch (type) {
                    case 'custom':
                        return {
                            from: newScope.config.windowFilter.from,
                            to: newScope.config.windowFilter.to
                        };
                    case 'today':
                        return {
                            from: window.moment().startOf('day')
                        };
                    case 'days':
                        var from = window.moment().startOf('minute').subtract(1, 'days');
                        return {
                            from: from._d
                        };        
                    default:
                        var from = window.moment().startOf('day').subtract(1, type);
                        return {
                            from: from._d
                        };
                }
            }



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
            };

            if (extra) {
                newScope.editing = extra.editing ? true : false;
                newScope.extraData = extra;
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

            var _from = currentScope || templateScope.config;
            templateScope.selectionManager = (_from) ? _from.selectionManager : undefined;

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
                    reason: (reason ? ': ' + reason : reason)
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
            require: '?^^adfWidgetGrid',
            scope: {
                model: '=',
                content: '=',
                extra: '=',
                navOptionsHandler: '=?',
                filterHandler: '=?',
                widgetActionsHandler: '=?'
            },
            link: function($scope, $element, attrs, adfWidgetGridCtrl) {
                var currentScope = compileWidget($scope, $element, null);
                if (adfWidgetGridCtrl) {
                    $scope.search = $scope.search || {};
                    adfWidgetGridCtrl.updateWidgetFilters($scope.model.config.filter && $scope.model.config.filter.id);
                }

                var widgetConfigChangedEvt = $scope.$on('widgetConfigChanged', function(event, changeWidgets) {
                    if (changeWidgets) {
                        if (changeWidgets.indexOf($scope.model.wid) !== -1 && adfWidgetGridCtrl) {
                            adfWidgetGridCtrl.updateWidgetFilters($scope.model.config.filter && $scope.model.config.filter.id, true);
                        }
                    } else {
                        currentScope = compileWidget($scope, $element, currentScope, true);
                    }
                });

                var widgetReloadEvt = $scope.$on('widgetReload', function(event, reloadWidgets) {
                    var reloadWidget = true;
                    if (reloadWidgets && reloadWidgets.length > 0) {
                        reloadWidget = reloadWidgets.indexOf($scope.model.wid) !== -1;
                    }
                    if (reloadWidget) {
                        currentScope = compileWidget($scope, $element, currentScope, false);
                        if (adfWidgetGridCtrl && adfWidgetGridCtrl.updateWidgetFilters) {
                            adfWidgetGridCtrl.updateWidgetFilters($scope.model.config.filter && $scope.model.config.filter.id);
                        }
                    }
                });

                $scope.$on('destroy', function() {
                    widgetConfigChangedEvt();
                    widgetReloadEvt();
                });
            }
        };
    });