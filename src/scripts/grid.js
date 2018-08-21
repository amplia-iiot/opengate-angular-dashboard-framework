/*
 * The MIT License
 *
 * Copyright (c) 2015, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/* global angular */
angular.module('adf')
    .directive('adfDashboardGrid', function(adfTemplatePath) {
        'use strict';

        function preLink($scope) {
            $scope.gridOptions = {
                cellHeight: 146,
                verticalMargin: 10,
                animate: true,
                float: false,
                alwaysShowResizeHandle: true,
                minWidth: 768,
                auto: true,
                resizable: {
                    handles: 'e, se, s, sw, w'
                },
                disableDrag: !$scope.editMode,
                disableResize: !$scope.editMode
            };

            $scope.gsHandler = null;
        }

        return {
            restrict: 'E',
            scope: {
                adfModel: '=',
                editMode: '=',
                continuousEditMode: '=',
                options: '='
            },
            templateUrl: adfTemplatePath + 'dashboard-grid.html',
            compile: function() {
                return {
                    pre: preLink,
                };
            },
            controller: function($scope, $timeout) {
                var dashEvents = [];
                dashEvents.push($scope.$on('adfIsEditMode', function() {
                    $timeout(function() {
                        $scope.gsHandler.enable();
                    }, 100);
                }));

                dashEvents.push($scope.$on('adfDashboardChanged', function() {
                    $timeout(function() {
                        $scope.gsHandler.disable();
                    }, 100);
                }));

                dashEvents.push($scope.$on('adfDashboardEditsCancelled', function() {
                    $timeout(function() {
                        $scope.gsHandler.disable();
                    }, 100);
                }));

                dashEvents.push($scope.$on('adfCancelEditMode', function() {
                    $timeout(function() {
                        $scope.gsHandler.disable();
                    }, 100);
                }));

                dashEvents.push($scope.$on('adfWidgetAdded', function(event) {
                    $timeout(function() {
                        $scope.adfModel.grid = GridStackUI.Utils.sort($scope.adfModel.grid);
                        $scope.gsHandler.enable();
                    }, 100);
                }));

                $scope.onChange = function(event, items) {
                    //console.log('onChange event: ' + event + ' items:' + items);
                    $scope.adfModel.grid = GridStackUI.Utils.sort($scope.adfModel.grid);
                };

                $scope.onDragStart = function(event, ui) {
                    console.log('onDragStart event: ' + event + ' ui:' + ui);
                };

                $scope.onDragStop = function(event, ui) {
                    console.log('onDragStop event: ' + event + ' ui:' + ui);
                    $scope.adfModel.grid = GridStackUI.Utils.sort($scope.adfModel.grid);
                };

                $scope.onResizeStart = function(event, ui) {
                    console.log('onResizeStart event: ' + event + ' ui:' + ui);
                };

                $scope.onResizeStop = function(event, ui) {
                    console.log('onResizeStop event: ' + event + ' ui:' + ui);
                    $scope.adfModel.grid = GridStackUI.Utils.sort($scope.adfModel.grid);
                    $scope.$broadcast('OnResizeWidget');
                };

                $scope.onItemAdded = function(item) {
                    console.log('onItemAdded item: ' + item);
                };

                $scope.onItemRemoved = function(item) {
                    console.log('onItemRemoved item: ' + item);
                };

                $scope.$on('destroy', function() {
                    dashEvents.forEach(function(dashEvt) {
                        dashEvt();
                    });
                });
            }
        };
    });