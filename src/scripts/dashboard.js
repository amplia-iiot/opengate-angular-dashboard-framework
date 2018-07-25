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

/**
 * @ngdoc directive
 * @name adf.directive:adfDashboard
 * @element div
 * @restrict EA
 * @scope
 * @description
 *
 * `adfDashboard` is a directive which renders the dashboard with all its
 * components. The directive requires a name attribute. The name of the
 * dashboard can be used to store the model.
 *
 * @param {string} name name of the dashboard. This attribute is required.
 * @param {boolean=} editable false to disable the editmode of the dashboard.
 * @param {boolean=} collapsible true to make widgets collapsible on the dashboard.
 * @param {boolean=} maximizable true to add a button for open widgets in a large modal panel.
 * @param {boolean=} enableConfirmDelete true to ask before remove an widget from the dashboard.
 * @param {object=} adfModel model object of the dashboard.
 * @param {function=} adfWidgetFilter function to filter widgets on the add dialog.
 * @param {boolean=} continuousEditMode enable continuous edit mode, to fire add/change/remove
 *                   events during edit mode not reset it if edit mode is exited.
 * @param {boolean=} categories enable categories for the add widget dialog.
 */

angular.module('adf')
    .directive('adfDashboard', function($rootScope, $log, $timeout, $uibModal, dashboard, adfTemplatePath, $faIcons, $translate) {
        'use strict';

        function stringToBoolean(string) {
            switch (angular.isDefined(string) ? string.toLowerCase() : null) {
                case 'true':
                case 'yes':
                case '1':
                    return true;
                case 'false':
                case 'no':
                case '0':
                case null:
                    return false;
                default:
                    return Boolean(string);
            }
        }


        function createConfiguration(type) {
            var cfg = {};
            var config = dashboard.widgets[type].config;
            if (config) {
                cfg = angular.copy(config);
            }
            return cfg;
        }

        function createWidget(type) {
            var wdgt = {};
            var widget = dashboard.widgets[type];
            if (widget) {
                wdgt = angular.copy(widget);
            }
            return wdgt;
        }

        /**
         * Adds the widget to first column of the model.
         *
         * @param dashboard model
         * @param widget to add to model
         * @param name name of the dashboard
         */
        function addNewWidgetToModel(model, widget, name, forceToSave) {
            if (model) {
                if (!model.grid) {
                    model.grid = [];
                }

                var newWidget = {
                    width: 3,
                    height: 2,
                    x: 0,
                    y: 0,
                    definition: widget
                };
                model.grid.push(newWidget);

                $rootScope.$broadcast('adfWidgetAdded', name, model, widget);

                if (forceToSave) {
                    $rootScope.$broadcast('adfDashboardChanged', name, model);
                }
            } else {
                $log.error('model is undefined');
            }
        }

        /**
         * Checks if the edit mode of the widget should be opened immediately.
         *
         * @param widget type
         */
        function isEditModeImmediate(type) {
            var widget = dashboard.widgets[type];
            return widget && widget.edit && widget.edit.immediate;
        }

        /**
         * Opens the edit mode of the specified widget.
         *
         * @param dashboard scope
         * @param widget
         */
        function openEditMode($scope, widget) {
            // wait some time before fire enter edit mode event
            $timeout(function() {
                $scope.$broadcast('adfWidgetEnterEditMode', widget);
            }, 200);
        }

        /**
         * Splits an object into an array multiple objects inside.
         *
         * @param object source object
         * @param size size of array
         *
         * @return array of splitted objects
         */
        function split(object, size) {
            var arr = [];
            var i = 0;
            angular.forEach(object, function(value, key) {
                var index = i++ % size;
                if (!arr[index]) {
                    arr[index] = {};
                }
                arr[index][key] = value;
            });
            return arr;
        }

        /**
         * Creates object with the category name as key and an array of widgets as value.
         *
         * @param widgets array of widgets
         *
         * @return array of categories
         */
        function createCategories(widgets) {
            var categories = {};
            angular.forEach(widgets, function(widget, key) {
                var category = widget.category;
                // if the widget has no category use a default one
                if (!category) {
                    category = 'ADF.CATEGORY.MISCELANOUS';
                }

                widget.title = $translate.instant(widget.title);
                widget.description = $translate.instant(widget.description);
                widget.category = $translate.instant(widget.category);

                // push widget to category array
                if (angular.isUndefined(categories[widget.category])) {
                    categories[widget.category] = {
                        widgets: {}
                    };
                }

                categories[widget.category].widgets[key] = widget;
            });
            return categories;
        }

        function createCategoriesList(widgets) {
            var categories = [];
            angular.forEach(widgets, function(widget, key) {
                if (!widget.category) {
                    widget.category = 'ADF.CATEGORY.MISCELLANEOUS';
                }

                widget.title = $translate.instant(widget.title);
                widget.description = $translate.instant(widget.description);
                widget.category = $translate.instant(widget.category);

                if (!widget.categoryTags) {
                    widget.categoryTags = 'ADF.CATEGORY.TAG.MISCELLANEOUS';
                }

                var categoriesTmp = widget.categoryTags.split(',');

                angular.forEach(categoriesTmp, function(category, idx) {
                    // push widget to category array
                    var translatedCat = $translate.instant(category);
                    if (categories.indexOf(translatedCat) === -1)
                        categories.push(translatedCat);
                });

            });
            return categories;
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            scope: {
                name: '@',
                collapsible: '@',
                editable: '@',
                editMode: '@',
                continuousEditMode: '=',
                maximizable: '@',
                adfModel: '=',
                adfWidgetFilter: '=',
                categories: '@',
                hideButtons: '=',
                extraData: '='
            },
            controller: function($scope) {
                var model = {};
                var widgetFilter = null;
                var name = $scope.name;

                // Watching for changes on adfModel
                $scope.$watch('adfModel', function(oldVal, newVal) {
                    // has model changed or is the model attribute not set
                    if (newVal !== null || (oldVal === null && newVal === null)) {
                        model = $scope.adfModel;
                        widgetFilter = $scope.adfWidgetFilter;

                        if (model) {
                            if (!model.title) {
                                model.title = $translate.instant('ADF.DASHBOARD.TITLE.EMPTY_DASHBOARD');
                            }
                            if (!model.titleTemplateUrl) {
                                model.titleTemplateUrl = adfTemplatePath + 'dashboard-title.html';
                            }
                            $scope.model = model;
                        } else {
                            $log.error('could not find or create model');
                        }
                    }
                }, true);

                // edit mode
                $scope.editMode = false;
                $scope.editClass = '';

                function getNewModalScope() {
                    var scope = $scope.$new();
                    return scope;
                }

                $scope.deleteDashboard = function() {
                    var dashData = {
                        id: model.id,
                        name: model.title
                    };

                    $rootScope.$broadcast('dashboardDelete', dashData);
                };

                $scope.toggleEditMode = function(openConfigWindow) {
                    $scope.editMode = !$scope.editMode;
                    if ($scope.editMode) {
                        if (!$scope.continuousEditMode) {
                            $scope.modelCopy = angular.copy($scope.adfModel, {});
                            $rootScope.$broadcast('adfIsEditMode');
                        }

                        if (openConfigWindow) {
                            $scope.editDashboardDialog();
                        }
                    }

                    if (!$scope.editMode) {
                        $rootScope.$broadcast('adfDashboardChanged', name, model);
                    }
                };

                $scope.saveTemporalDashboard = function() {
                    delete model.temporal;
                    $rootScope.$broadcast('adfDashboardChanged', name, model);
                };

                var adfToggleEditMode = $scope.$on('adfToggleEditMode', function(event, isNewDashboard) {
                    if (isNewDashboard) {
                        $scope.toggleEditMode(true);
                    } else {
                        $scope.toggleEditMode();
                    }
                });

                var adfCancelEditMode = $scope.$on('adfCancelEditMode', function(event, isNewDashboard) {
                    if ($scope.editMode) {
                        $scope.cancelEditMode();
                    }
                });

                var adfWidgetRemoved = $scope.$on('adfWidgetRemovedFromGrid', function(event, widget) {
                    var index = null;
                    angular.forEach($scope.adfModel.grid, function(widgetTmp, idx) {
                        if (widgetTmp.definition.wid === widget.wid) {
                            index = idx;
                        }
                    });

                    if (index >= 0) {
                        $scope.adfModel.grid.splice(index, 1);
                        //$scope.gsHandler.commit();
                    }
                })

                $scope.collapseAll = function(collapseExpandStatus) {
                    $rootScope.$broadcast('adfDashboardCollapseExpand', {
                        collapseExpandStatus: collapseExpandStatus
                    });
                };

                $scope.cancelEditMode = function() {
                    $scope.editMode = false;
                    if (!$scope.continuousEditMode && ($scope.modelCopy !== $scope.adfModel)) {
                        $scope.modelCopy = angular.copy($scope.modelCopy, $scope.adfModel);
                    }
                    $rootScope.$broadcast('adfDashboardEditsCancelled');
                };

                var adfEditDashboardDialog = $scope.$on('adfEditDashboardDialog', function(event, isNewDashboard) {
                    if ($scope.editMode) {
                        $scope.editDashboardDialog();
                    }
                });

                var adfLaunchSearchingFromWidget = $scope.$on('adfLaunchSearchingFromWidget', function(event, widget, configFilter) {
                    $rootScope.$broadcast('adfFilterChanged', name, model);
                });
                var adfWindowTimeChangedFromWidget = $scope.$on('adfWindowTimeChangedFromWidget', function(event, widget, windowFilter) {
                    $rootScope.$broadcast('adfFilterChanged', name, model);
                });

                // edit dashboard settings
                $scope.editDashboardDialog = function() {
                    var editDashboardScope = getNewModalScope();
                    // create a copy of the title, to avoid changing the title to
                    // "dashboard" if the field is empty
                    editDashboardScope.copy = {
                        title: (model.title !== 'ADF.DASHBOARD.TITLE.EMPTY_DASHBOARD' ? model.title : ''),
                        description: model.description,
                        icon: model.icon ? model.icon : 'fa-tachometer'
                    };

                    // pass icon list
                    editDashboardScope.availableIcons = $faIcons.list();

                    var adfEditTemplatePath = adfTemplatePath + 'dashboard-edit.html';
                    if (model.editTemplateUrl) {
                        adfEditTemplatePath = model.editTemplateUrl;
                    }
                    var instance = $uibModal.open({
                        scope: editDashboardScope,
                        templateUrl: adfEditTemplatePath,
                        backdrop: 'static',
                        keyboard: false,
                        size: 'lg'
                    });


                    editDashboardScope.closeDialog = function() {
                        // copy the new title back to the model
                        model.title = editDashboardScope.copy.title;
                        model.description = editDashboardScope.copy.description;
                        model.icon = editDashboardScope.copy.icon;

                        // close modal and destroy the scope
                        instance.close();
                        editDashboardScope.$destroy();
                    };
                };

                var adfOpenWidgetFromOther = $scope.$on('adfOpenWidgetFromOther', function(event, widget, config) {

                    var internal_config = createConfiguration(widget);
                    var _config = angular.merge({}, internal_config, config);
                    var w = {
                        type: widget,
                        config: _config,
                        title: _config.title
                    };
                    addNewWidgetToModel(model, w, name, !$scope.editMode);
                });

                var adfOpenModalWidgetFromOther = $scope.$on('adfOpenModalWidgetFromOther', function(event, widgetType, config) {
                    var templateUrl = adfTemplatePath + 'widget-fullscreen.html';
                    if (config.sendSelection) {
                        templateUrl = adfTemplatePath + 'widget-fullscreen-selection.html';
                    }
                    var widget = createWidget(widgetType);
                    widget.config = angular.merge({}, widget.config, config);
                    widget.type = widgetType;
                    if (widget.config.title) {
                        widget.title = widget.config.title;
                    }
                    var fullScreenScope = $scope.$new();
                    fullScreenScope.definition = fullScreenScope.widget = widget;
                    var opts = {
                        scope: fullScreenScope,
                        templateUrl: templateUrl,
                        size: fullScreenScope.definition.modalSize || 'el', // 'sm', 'lg'
                        backdrop: 'static',
                        windowClass: (fullScreenScope.definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    };

                    if ($scope.model && !$scope.model.temporal) {
                        fullScreenScope.persistDashboard = function() {
                            $rootScope.$broadcast('adfOpenWidgetFromOther', this.$parent.widget.type, this.$parent.widget.config);
                            this.closeDialog();
                        }
                    }

                    var instance = $uibModal.open(opts);
                    fullScreenScope.closeDialog = function() {
                        instance.close();
                        fullScreenScope.$destroy();
                    };


                });

                var adfAddWidgetDialog = $scope.$on('adfAddWidgetDialog', function(event, isNewDashboard) {
                    if (!model.temporal && model.editable) {
                        if (!$scope.editMode) {
                            $scope.editMode = true;
                            $scope.modelCopy = angular.copy($scope.adfModel, {});
                            $rootScope.$broadcast('adfIsEditMode');
                        }

                        $scope.addWidgetDialog();
                    }
                });

                // add widget dialog
                $scope.addScopeCfg = {
                    widgetFilter: {},
                    widgetSortingDirection: '',
                    widgetSorting: 'priority'
                };

                $scope.addWidgetDialog = function() {
                    var addScope = getNewModalScope();
                    var widgets;
                    if (angular.isFunction(widgetFilter)) {
                        widgets = {};
                        angular.forEach(dashboard.widgets, function(widget, type) {
                            if (widgetFilter(widget, type, model)) {
                                widgets[type] = widget;
                            }
                        });
                    } else {
                        widgets = dashboard.widgets;
                    }
                    addScope.widgets = widgets;

                    angular.forEach(addScope.widgets, function(widget, type) {
                        widget.key = type;
                        if (!widget.category) {
                            widget.category = 'Miscellaneous';
                        }
                    });

                    // pass createCategories function to scope, if categories option is enabled
                    if ($scope.options.categories) {
                        addScope.createCategories = createCategories;
                    } else {
                        addScope.availableCategories = createCategoriesList(widgets);
                    }

                    var adfAddTemplatePath = adfTemplatePath + 'widget-add.html';
                    if (model.addTemplateUrl) {
                        adfAddTemplatePath = model.addTemplateUrl;
                    }

                    var opts = {
                        scope: addScope,
                        templateUrl: adfAddTemplatePath,
                        backdrop: 'static',
                        size: 'lg'
                    };

                    var instance = $uibModal.open(opts);

                    addScope.widgetFilterCfg = $scope.addScopeCfg;

                    addScope.addWidget = function(widget) {
                        var w = {
                            type: widget,
                            Ftype: dashboard.widgets[widget].Ftype || null,
                            config: createConfiguration(widget)
                        };
                        addNewWidgetToModel(model, w, name);
                        // close and destroy
                        instance.close();
                        addScope.$destroy();

                        // check for open edit mode immediately
                        if (isEditModeImmediate(widget)) {
                            openEditMode($scope, w);
                        }
                    };

                    addScope.changeThumbnail = function(widget) {
                        if (widget.images) {
                            if (angular.isUndefined(widget._currThumb)) {
                                widget._currThumb = 1;
                            } else {
                                widget._currThumb += 1;
                            }


                            if (widget._currThumb >= widget.images.length) {
                                widget._currThumb = 0;
                            }

                            widget._currImg = widget.images[widget._currThumb];
                        }
                    };

                    addScope.closeDialog = function() {
                        // close and destroy
                        instance.close();
                        addScope.$destroy();
                    };
                };

                $scope.addNewWidgetToModel = addNewWidgetToModel;

                $scope.$on('destroy', function() {
                    adfLaunchSearchingFromWidget();
                    adfWindowTimeChangedFromWidget();
                    adfToggleEditMode();
                    adfOpenWidgetFromOther();
                    adfOpenModalWidgetFromOther();
                    adfCancelEditMode();
                    adfAddWidgetDialog();
                    adfEditDashboardDialog();
                    adfWidgetRemoved();
                });
            },
            link: function($scope, $element, $attr) {
                // pass options to scope
                var options = {
                    name: $attr.name,
                    editable: true,
                    enableConfirmDelete: stringToBoolean($attr.enableConfirmDelete),
                    maximizable: stringToBoolean($attr.maximizable),
                    collapsible: stringToBoolean($attr.collapsible),
                    categories: stringToBoolean($attr.categories),
                    extraData: {}
                };

                if (angular.isDefined($attr.editable)) {
                    options.editable = stringToBoolean($attr.editable);
                }

                if (angular.isDefined($scope.extraData)) {
                    options.extraData = $scope.extraData;
                }

                options.extraData.editing = $scope.editMode;

                $scope.options = options;
            },
            templateUrl: adfTemplatePath + 'dashboard.html'
        };
    });