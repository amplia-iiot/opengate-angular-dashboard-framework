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
        $compile, $controller, $injector, dashboard) {

        function renderError($element, msg) {
            $log.warn(msg);
            $element.html(dashboard.messageTemplate.replace(/{}/g, msg));
        }

        function compileWidget($scope, $element, currentScope, configChanged, showFirstPage) {
            var model = $scope.model;
            var content = $scope.content;
            var editing = $scope.editing;

            var newScope = currentScope;
            if (!model) {
                renderError($element, 'model is undefined');
            } else if (!content) {
                //var msg = 'widget content is undefined, please have a look at your browser log';
                var msg = 'Widget ' + (model.title ? 'for "' + model.title + '"' : '') + ' has been deprecated. In order to continue you have to delete this one and look for the equivalent one.';
                renderError($element, msg);
            } else {
                if (newScope && newScope.menu !== undefined) { //adf-widget-browser
                    newScope = renderWidget($scope, $element, currentScope, model, content);
                } else {
                    if (newScope && newScope.reloadData && !configChanged) {
                        if (newScope.itemsPerPage !== undefined && isNaN(newScope.itemsPerPage)) {
                            newScope = renderWidget($scope, $element, currentScope, model, content);
                        } else {
                            newScope.reloadData(showFirstPage ? true : false);
                        }
                    } else if (newScope && newScope.reloadData && newScope.needConfiguration !== undefined && !newScope.needConfiguration) {
                        newScope.reloadData(showFirstPage ? true : false);
                    } else {
                        newScope = renderWidget($scope, $element, currentScope, model, content, editing);
                    }
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

                newScope.editing = editing ? editing : false;
            }
            return newScope;
        }

        function renderWidget($scope, $element, currentScope, model, content, editing) {
            // display loading template
            $element.html(dashboard.loadingTemplate);

            // create new scope
            var templateScope = $scope.$new();

            // pass config object to scope
            if (!model.config) {
                model.config = {};
            }

            templateScope.config = model.config;
            templateScope.editing = editing;
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
                var msg = 'Could not resolve all promises';
                if (reason) {
                    msg += ': ' + reason;
                }
                renderError($element, msg);
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
                editing: '='
            },
            link: function($scope, $element) {
                var currentScope = compileWidget($scope, $element, null);
                var widgetConfigChangedEvt = $scope.$on('widgetConfigChanged', function() {
                    currentScope = compileWidget($scope, $element, currentScope, true);
                });

                var widgetReloadEvt = $scope.$on('widgetReload', function(event, completeReload) {
                    currentScope = compileWidget($scope, $element, currentScope, false, completeReload ? true : false);
                });

                $scope.$on('destroy', function() {
                    widgetConfigChangedEvt();
                    widgetReloadEvt();
                });
            }
        };
    });