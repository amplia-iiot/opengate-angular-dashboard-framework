(function(window, undefined) {'use strict';
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



angular.module('adf', ['adf.provider', 'ui.bootstrap', 'opengate-angular-js'])
    .value('adfTemplatePath', '../src/templates/')
    .value('columnTemplate', '<adf-dashboard-column column="column" adf-model="adfModel" options="options" edit-mode="editMode" ng-repeat="column in row.columns" />')
    .value('adfVersion', '7.0.0');
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
    .directive('adfDashboard', ["$rootScope", "$log", "$timeout", "$uibModal", "dashboard", "adfTemplatePath", "$faIcons", "$translate", "Upload", function($rootScope, $log, $timeout, $uibModal, dashboard, adfTemplatePath, $faIcons, $translate, Upload) {
        

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
            controller: ["$scope", function($scope) {
                var model = {};
                var widgetFilter = null;
                var name = $scope.name;

                var _getReloadWidgets = function(widget) {
                    var reloadWidgets = {
                        configChange: [],
                        reload: []
                    };
                    if (widget) {
                        var definition = angular.copy(widget.definition);
                        var ftype = definition.Ftype;
                        var id = definition.wid;
                        var config = definition.config;
                        if (config) {
                            var filter = config.filter;
                            model.grid.forEach(function(w) {
                                var f = w.definition.config.filter;
                                var ft = w.definition.Ftype;
                                //solo recargamos y actualizamos los widgets:
                                // - que tengan filtro
                                // y que el id tenga filtro
                                // y que el id del filtro coincida con el wid del widget que ha modificado el fitro
                                if (f && f.id && f.id === id) {
                                    w.definition.config.filter = filter;
                                    w.definition.config.filter.id = id;
                                    reloadWidgets.reload.push(w.definition.wid);
                                } else if (ftype === ft) {
                                    reloadWidgets.configChange.push(w.definition.wid);
                                }
                            });
                        }
                    }
                    return reloadWidgets;
                };

                var updateWidgetFilters = function(model) {
                    var widgetFilters = [];
                    var grid = model.grid;
                    if (grid && grid.length > 0) {
                        grid.forEach(function(element) {
                            var definition = element.definition;
                            var config = definition.config;
                            var filter = config.filter;
                            widgetFilters.push({
                                wid: definition.wid,
                                title: definition.title,
                                filter: filter,
                                Ftype: definition.Ftype
                            });
                        });
                    }
                    if (!$scope.options) {
                        $scope.options = {
                            extraData: {}
                        };
                    }
                    $scope.options.extraData.widgetFilters = widgetFilters;
                };
                // Watching for changes on adfModel
                $scope.$watch('adfModel', function(oldVal, newVal) {
                    // has model changed or is the model attribute not set
                    if (newVal !== null || (oldVal === null && newVal === null)) {
                        model = $scope.adfModel;
                        widgetFilter = $scope.adfWidgetFilter;

                        if (model) {
                            updateWidgetFilters(model);
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

                function getNewModalScope() {
                    var scope = $scope.$new();
                    return scope;
                }

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

                var adfToggleEditMode = $scope.$on('adfToggleEditMode', function(event, isNewDashboard) {
                    if (isNewDashboard) {
                        $scope.toggleEditMode(true);
                    } else {
                        $scope.toggleEditMode();
                    }
                });

                var adfCancelEditMode = $scope.$on('adfCancelEditMode', function(event) {
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
                    }
                });

                $scope.cancelEditMode = function() {
                    $scope.editMode = false;
                    if (!$scope.continuousEditMode && ($scope.modelCopy !== $scope.adfModel)) {
                        $scope.modelCopy = angular.copy($scope.modelCopy, $scope.adfModel);
                    }
                    $rootScope.$broadcast('adfDashboardEditsCancelled');
                };

                var adfEditDashboardDialog = $scope.$on('adfEditDashboardDialog', function(event) {
                    if ($scope.editMode) {
                        $scope.editDashboardDialog();
                    }
                });


                var adfLaunchSearchingFromWidget = $scope.$on('adfLaunchSearchingFromWidget', function(event, widget) {
                    var reloadWidgets = _getReloadWidgets(widget);
                    $rootScope.$broadcast('adfFilterChanged', name, model, reloadWidgets);
                });
                var adfWindowTimeChangedFromWidget = $scope.$on('adfWindowTimeChangedFromWidget', function(event) {
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
                        backgroundColor: model.backgroundColor ? model.backgroundColor : undefined,
                        time: new Date(),
                        backgroundImage: model.backgroundImage ? model.backgroundImage : undefined,
                        file: model.backgroundImage ? model.backgroundImage : undefined,
                    };

                    editDashboardScope.backgroundSize = {
                        name: 'backgroundSize',
                        model: model.backgroundImageSize ? model.backgroundImageSize : '100% 100%',
                        options: {
                            '100% 100%': {
                                title: $translate.instant('SIZE_CONF.AUTO')
                            },
                            'contain': {
                                title: $translate.instant('SIZE_CONF.CONTAIN')
                            },
                            'cover': {
                                title: $translate.instant('SIZE_CONF.COVER')
                            }
                        }
                    };

                    editDashboardScope.iconConfiguration = {
                        name: 'iconConfiguration',
                        model: model.iconType ? model.iconType : 'icon',
                        url: undefined,
                        file: undefined,
                        iconType: model.iconType ? model.iconType : 'icon',
                        icon: model.iconType === 'icon' ? model.icon : 'fa-tachometer',
                        options: {
                            'icon': {
                                title: $translate.instant('ICON.LIBRARY'),
                            },
                            'image': {
                                title: $translate.instant('ICON.IMAGE')
                            }
                        }
                    };
                    if (editDashboardScope.iconConfiguration.iconType === 'image') {
                        editDashboardScope.iconConfiguration.file = model.icon;
                        editDashboardScope.iconConfiguration.url = model.icon;
                    }
                    editDashboardScope.imageSelected = function(file) {
                        if (file) {
                            editDashboardScope.iconConfiguration.file = file;
                            Upload.base64DataUrl(file).then(
                                function(url) {
                                    editDashboardScope.iconConfiguration.url = url;
                                    editDashboardScope.iconConfiguration.file = url;
                                    editDashboardScope.iconConfiguration.iconType = 'image'

                                });
                        } else {
                            editDashboardScope.removeDataFile();
                        }
                    };
                    editDashboardScope.backgroundImageSelected = function(file) {
                        if (file) {
                            editDashboardScope.iconConfiguration.file = file;
                            Upload.base64DataUrl(file).then(
                                function(url) {
                                    editDashboardScope.copy.backgroundImage = url;
                                    editDashboardScope.copy.file = url;

                                });
                        } else {
                            editDashboardScope.removeBackgroundFile();
                        }
                    };
                    editDashboardScope.removeDataFile = function() {
                        editDashboardScope.iconConfiguration.file = null;
                        editDashboardScope.iconConfiguration.url = null;
                    };
                    editDashboardScope.removeBackgroundFile = function() {
                        editDashboardScope.copy.backgroundImage = null;
                        editDashboardScope.copy.file = null;

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
                        if (editDashboardScope.iconConfiguration.model === 'image') {
                            model.icon = editDashboardScope.iconConfiguration.url;

                        } else if (editDashboardScope.iconConfiguration.model === 'icon') {
                            model.icon = editDashboardScope.iconConfiguration.icon;

                        }
                        model.iconType = editDashboardScope.iconConfiguration.model;
                        model.backgroundColor = editDashboardScope.copy.backgroundColor ? editDashboardScope.copy.backgroundColor : undefined;
                        model.backgroundImage = editDashboardScope.copy.backgroundImage ? editDashboardScope.copy.backgroundImage : undefined;
                        model.backgroundImageSize = editDashboardScope.backgroundSize.model;
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
                        size: fullScreenScope.definition.modalSize || 'el',
                        backdrop: 'static',
                        windowClass: (fullScreenScope.definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    };

                    if ($scope.model && !$scope.model.temporal) {
                        fullScreenScope.persistDashboard = function() {
                            $rootScope.$broadcast('adfOpenWidgetFromOther', this.$parent.widget.type, this.$parent.widget.config);
                            this.closeDialog();
                        };
                    }

                    var instance = $uibModal.open(opts);
                    fullScreenScope.closeDialog = function() {
                        instance.close();
                        fullScreenScope.$destroy();
                    };


                });

                var adfAddWidgetDialog = $scope.$on('adfAddWidgetDialog', function(event) {
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
            }],
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
    }]);
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
    .directive('adfDashboardGrid', ["adfTemplatePath", function(adfTemplatePath) {
        

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
            controller: ["$scope", "$timeout", function($scope, $timeout) {
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
            }]
        };
    }]);
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


/* global angular */
angular.module('adf')
  .filter('adfOrderByObjectKey', ["$filter", function($filter) {
    

    return function(item, key){
      var array = [];
      angular.forEach(item, function(value, objectKey){
        value[key] = objectKey;
        array.push(value);
      });
      return $filter('orderBy')(array, key);
    };
  }]);

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
 * @ngdoc object
 * @name adf.dashboardProvider
 * @description
 *
 * The dashboardProvider can be used to register widgets.
 */
angular.module('adf.provider', [])
    .provider('dashboard', function() {

        var widgets = {};
        var widgetsPath = '';
        var messageTemplate = '<div class="alert alert-primary">{}</div>';
        var loadingTemplate = '\
      <div class="progress progress-striped active">\n\
        <div class="progress-bar" role="progressbar" style="width: 100%">\n\
          <span class="sr-only" translate>FORM.MSG.LOADING ...</span>\n\
        </div>\n\
      </div>';
        var customWidgetTemplatePath = null;

        // default apply function of widget.edit.apply
        var defaultApplyFunction = function() {
            return true;
        };

        /**
         * @ngdoc method
         * @name adf.dashboardProvider#widget
         * @methodOf adf.dashboardProvider
         * @description
         *
         * Registers a new widget.
         *
         * @param {string} name of the widget
         * @param {object} widget to be registered.
         *
         *   Object properties:
         *
         *   - `title` - `{string=}` - The title of the widget.
         *   - `description` - `{string=}` - Description of the widget.
         *   - `category` - `{string=}` - Category of the widget.
         *   - `collapsed` - `{boolean=}` - true if the widget should be in collapsed state. Default is false.
         *   - `config` - `{object}` - Predefined widget configuration.
         *   - `controller` - `{string=|function()=}` - Controller fn that should be
         *      associated with newly created scope of the widget or the name of a
         *      {@link http://docs.angularjs.org/api/angular.Module#controller registered controller}
         *      if passed as a string.
         *   - `controllerAs` - `{string=}` - A controller alias name. If present the controller will be
         *      published to scope under the `controllerAs` name.
         *   - `frameless` - `{boolean=}` - false if the widget should be shown in frameless mode. The default is false.
         *   - `styleClass` - `{object}` - space delimited string or map of classes bound to the widget.
         *   - `template` - `{string=|function()=}` - html template as a string.
         *   - `templateUrl` - `{string=}` - path to an html template.
         *   - `reload` - `{boolean=}` - true if the widget could be reloaded. The default is false.
         *   - `resolve` - `{Object.<string, function>=}` - An optional map of dependencies which should
         *      be injected into the controller. If any of these dependencies are promises, the widget
         *      will wait for them all to be resolved or one to be rejected before the controller is
         *      instantiated.
         *      If all the promises are resolved successfully, the values of the resolved promises are
         *      injected.
         *
         *      The map object is:
         *      - `key` – `{string}`: a name of a dependency to be injected into the controller.
         *      - `factory` - `{string|function}`: If `string` then it is an alias for a service.
         *        Otherwise if function, then it is {@link http://docs.angularjs.org/api/AUTO.$injector#invoke injected}
         *        and the return value is treated as the dependency. If the result is a promise, it is
         *        resolved before its value is injected into the controller.
         *   - `resolveAs` - `{string=}` - The name under which the resolve map will be available
         *      on the scope of the widget.
         *   - `edit` - `{object}` - Edit modus of the widget.
         *      - `controller` - `{string=|function()=}` - Same as above, but for the edit mode of the widget.
         *      - `controllerAs` - `{string=}` - Same as above, but for the edit mode of the widget.
         *      - `template` - `{string=|function()=}` - Same as above, but for the edit mode of the widget.
         *      - `templateUrl` - `{string=}` - Same as above, but for the edit mode of the widget.
         *      - `resolve` - `{Object.<string, function>=}` - Same as above, but for the edit mode of the widget.
         *      - `resolveAs` - `{string=}` - The name under which the resolve map will be available
         *        on the scope of the widget.
         *      - `reload` - {boolean} - true if the widget should be reloaded, after the edit mode is closed.
         *        Default is true.
         *      - `immediate` - {boolean} - The widget enters the edit mode immediately after creation. Default is false.
         *      - `apply` - `{function()=}` - The apply function is called, before the widget is saved.
         *        The function have to return a boolean or an promise which can be resolved to a boolean.
         *        The function can use injection.
         *
         * @returns {Object} self
         */
        this.widget = function(name, widget) {
            var w = angular.extend({
                reload: false,
                frameless: false
            }, widget);
            if (w.edit) {
                var edit = {
                    reload: true,
                    immediate: false,
                    apply: defaultApplyFunction
                };
                angular.extend(edit, w.edit);
                w.edit = edit;
            }
            widgets[name] = w;
            return this;
        };

        /**
         * @ngdoc method
         * @name adf.dashboardProvider#widgetsPath
         * @methodOf adf.dashboardProvider
         * @description
         *
         * Sets the path to the directory which contains the widgets. The widgets
         * path is used for widgets with a templateUrl which contains the
         * placeholder {widgetsPath}. The placeholder is replaced with the
         * configured value, before the template is loaded, but the template is
         * cached with the unmodified templateUrl (e.g.: {widgetPath}/src/widgets).
         * The default value of widgetPaths is ''.
         *
         *
         * @param {string} path to the directory which contains the widgets
         *
         * @returns {Object} self
         */
        this.widgetsPath = function(path) {
            widgetsPath = path;
            return this;
        };

        /**
         * @ngdoc method
         * @name adf.dashboardProvider#messageTemplate
         * @methodOf adf.dashboardProvider
         * @description
         *
         * Changes the template for messages.
         *
         * @param {string} template for messages.
         *
         * @returns {Object} self
         */
        this.messageTemplate = function(template) {
            messageTemplate = template;
            return this;
        };

        /**
         * @ngdoc method
         * @name adf.dashboardProvider#loadingTemplate
         * @methodOf adf.dashboardProvider
         * @description
         *
         * Changes the template which is displayed as
         * long as the widget resources are not resolved.
         *
         * @param {string} template loading template
         *
         * @returns {Object} self
         */
        this.loadingTemplate = function(template) {
            loadingTemplate = template;
            return this;
        };

        /**
         * @ngdoc method
         * @name adf.dashboardProvider#customWidgetTemplatePath
         * @propertyOf adf.dashboardProvider
         * @description
         *
         * Changes the container template for the widgets
         *
         * @param {string} path to the custom widget template
         *
         * @returns {Object} self
         */
        this.customWidgetTemplatePath = function(templatePath) {
            customWidgetTemplatePath = templatePath;
            return this;
        };

        /**
         * @ngdoc service
         * @name adf.dashboard
         * @description
         *
         * The dashboard holds all options and  widgets.
         *
         * @property {Array.<Object>} widgets Array of registered widgets.
         * @property {string} widgetsPath Default path for widgets.
         * @property {string} messageTemplate Template for messages.
         * @property {string} loadingTemplate Template for widget loading.
         * * @property {string} customWidgetTemplatePath Changes the container template for the widgets
         *
         * @returns {Object} self
         */
        this.$get = function() {
            var cid = 0;

            return {
                widgets: widgets,
                widgetsPath: widgetsPath,
                messageTemplate: messageTemplate,
                loadingTemplate: loadingTemplate,
                customWidgetTemplatePath: customWidgetTemplatePath,

                /**
                 * @ngdoc method
                 * @name adf.dashboard#id
                 * @methodOf adf.dashboard
                 * @description
                 *
                 * Creates an ongoing numeric id. The method is used to create ids for
                 * columns and widgets in the dashboard.
                 */
                id: function() {
                    return new Date().getTime() + '-' + (++cid);
                },

                /**
                 * @ngdoc method
                 * @name adf.dashboard#idEqual
                 * @methodOf adf.dashboard
                 * @description
                 *
                 * Checks if the given ids are equal.
                 *
                 * @param {string} id widget or column id
                 * @param {string} other widget or column id
                 */
                idEquals: function(id, other) {
                    // use toString, because old ids are numbers
                    return ((id) && (other)) && (id.toString() === other.toString());
                }
            };
        };

    });
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



angular.module('adf')
    .directive('adfWidgetContent', ["$log", "$q", "widgetService", "$compile", "$controller", "$injector", "dashboard", "$translate", function ($log, $q, widgetService,
        $compile, $controller, $injector, dashboard, $translate) {

        function renderError($element, msg) {
            $log.warn(msg);
            $element.html(dashboard.messageTemplate.replace(/{}/g, msg));
        }

        function compileWidget($scope, $element, currentScope, configChanged) {
            var model = $scope.model;
            if (!model) {
                $translate('ADF.ERROR.MODEL_IS_UNDEFINED').then(function (translateMessage) {
                    renderError($element, translateMessage);
                });
                return currentScope;
            }

            var content = $scope.content;

            if (!content) {
                $translate('ADF.ERROR.WIDGET_FOR_DEPRECTATED', {
                    title: model.title
                }).then(function (translateMessage) {
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
                if (type === 'custom') {
                    return {
                        from: newScope.config.windowFilter.from,
                        to: newScope.config.windowFilter.to
                    };
                }
                var from = window.moment().subtract(1, type);
                return {
                    from: from._d
                };
            }


            if (newScope.config) {
                newScope.config.getWindowTime = function () {
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
            }

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
                angular.forEach(content.resolve, function (promise, key) {
                    if (angular.isString(promise)) {
                        resolvers[key] = $injector.get(promise);
                    } else {
                        resolvers[key] = $injector.invoke(promise, promise, base);
                    }
                });
            }

            // resolve all resolvers
            $q.all(resolvers).then(function (locals) {
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
            }, function (reason) {
                // handle promise rejection
                var msg = 'ADF.ERROR.COULD_NOT_RESOLVE_ALL_PROMISSES';
                $translate(msg, {
                    reason: (reason ? ': ' + reason : reason)
                }).then(function (translateMessage) {
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
            link: function ($scope, $element, attrs, adfWidgetGridCtrl) {


                var currentScope = compileWidget($scope, $element, null);
                if (adfWidgetGridCtrl) {
                    $scope.search = $scope.search || {};
                    adfWidgetGridCtrl.updateWidgetFilters($scope.model.config.filter && $scope.model.config.filter.id);
                }
                var widgetConfigChangedEvt = $scope.$on('widgetConfigChanged', function (event, changeWidgets) {
                    if (changeWidgets && changeWidgets.indexOf($scope.model.wid) !== -1) {
                        adfWidgetGridCtrl.updateWidgetFilters($scope.model.config.filter && $scope.model.config.filter.id, true);
                    } else {
                        currentScope = compileWidget($scope, $element, currentScope, true);
                    }
                });

                var widgetReloadEvt = $scope.$on('widgetReload', function (event, reloadWidgets) {
                    var reloadWidget = true;
                    if (reloadWidgets && reloadWidgets.length > 0) {
                        reloadWidget = reloadWidgets.indexOf($scope.model.wid) !== -1;
                    }
                    if (reloadWidget) {
                        currentScope = compileWidget($scope, $element, currentScope, false);
                        if (adfWidgetGridCtrl) {
                            adfWidgetGridCtrl.updateWidgetFilters($scope.model.config.filter && $scope.model.config.filter.id);
                        }
                    }
                });

                $scope.$on('destroy', function () {
                    widgetConfigChangedEvt();
                    widgetReloadEvt();
                });
            }
        };
    }]);
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



angular.module('adf')
    .directive('adfWidgetGrid', ["$injector", "$q", "$log", "$uibModal", "$rootScope", "$interval", "dashboard", "adfTemplatePath", "Filter", function($injector, $q, $log, $uibModal, $rootScope, $interval, dashboard, adfTemplatePath, Filter) {
        function preLink($scope) {
            var definition = $scope.definition;

            if (definition) {
                var w = dashboard.widgets[definition.type];
                if (w) {
                    // pass title
                    if (!definition.title) {
                        definition.title = w.title;
                    }

                    definition.titleTemplateUrl = adfTemplatePath + 'widget-grid-title.html';

                    if (!definition.editTemplateUrl) {
                        definition.editTemplateUrl = adfTemplatePath + 'widget-edit.html';
                        if (w.editTemplateUrl) {
                            definition.editTemplateUrl = w.editTemplateUrl;
                        }
                    }

                    if (!definition.titleTemplateUrl) {
                        definition.frameless = w.frameless;
                    }

                    if (!definition.styleClass) {
                        definition.styleClass = w.styleClass;
                    }

                    // set id for sortable
                    if (!definition.wid) {
                        definition.wid = dashboard.id();
                    }

                    // pass copy of widget to scope
                    $scope.widget = angular.copy(w);

                    // create config object
                    var config = definition.config;
                    if (config) {
                        if (angular.isString(config)) {
                            config = angular.fromJson(config);
                        }
                    } else {
                        config = {};
                    }

                    if (typeof $scope.widget.show_modal_footer === 'undefined') {
                        $scope.widget.show_modal_footer = true;
                    }

                    if (typeof $scope.widget.show_reload_config === 'undefined') {
                        $scope.widget.show_reload_config = true;
                    }

                    // pass config to scope
                    $scope.config = config;

                    // collapse exposed $scope.widgetState property
                    if (!$scope.widgetState) {
                        $scope.widgetState = {};
                        $scope.widgetState.isCollapsed = (w.collapsed === true) ? w.collapsed : false;
                    }

                } else {
                    $log.warn('could not find widget ' + definition.type);
                }
            } else {
                $log.debug('definition not specified, widget was probably removed');
            }
        }

        function postLink($scope, $element) {
            var definition = $scope.definition;
            if (!definition) {
                $log.debug('widget not found');
                return;
            }
            if (!$scope.config) {
                $scope.config = {};
            }

            var config = $scope.config;

            // bind close function
            var deleteWidget = function() {
                $element.remove();
                $rootScope.$broadcast('adfWidgetRemovedFromGrid', definition);
            };

            $scope.remove = function() {
                if ($scope.options.enableConfirmDelete) {
                    var deleteScope = $scope.$new();

                    var deleteTemplateUrl = adfTemplatePath + 'widget-delete.html';
                    if (definition.deleteTemplateUrl) {
                        deleteTemplateUrl = definition.deleteTemplateUrl;
                    }
                    var opts = {
                        scope: deleteScope,
                        templateUrl: deleteTemplateUrl,
                        backdrop: 'static'
                    };
                    var instance = $uibModal.open(opts);

                    deleteScope.closeDialog = function() {
                        instance.close();
                        deleteScope.$destroy();
                    };
                    deleteScope.deleteDialog = function() {
                        deleteWidget();
                        deleteScope.closeDialog();
                    };
                } else {
                    deleteWidget();
                }
            };


            $scope.print = function() {
                if (!$scope.editMode) {
                    $scope.$broadcast('widgetPrint');
                }
            };

            $scope.isExecuteOperationEnabled = function() {

                if (config.entityKey)
                    return true;
                var filter = config.filter;
                if (filter && filter.type === "basic") {
                    return filter.length > 0;
                }
                if (filter && filter.type === "advanced") {
                    return filter.value.length > 2 && filter.oql;
                }
                return false;
            };

            $scope.executeOperation = function() {
                if (!$scope.editMode) {

                    $scope.$parent.$broadcast('widgetExecuteOperation');
                }
            };

            $scope.filter = {
                typeFilter: 1,
                showFilter: false,
                showFinalFilter: false
            };

            $scope.launchSearching = function() {
                var widget = {
                    definition: definition,
                    element: $element
                };

                $rootScope.$broadcast('adfLaunchSearchingFromWidget', widget, $scope.config.filter);
                $scope.reload();
            };


            $scope.launchSearchingAdv = function() {
                if (!$scope.filterApplied) {
                    $scope.search.quick = '';
                    if ($scope.search.json === '' || $scope.search.json === '{}' || (!angular.isString($scope.search.json) && Object.keys($scope.search.json).length === 0)) {
                        $scope.config.filter = {
                            type: 'advanced',
                            oql: '',
                            value: ''
                        };
                    } else {
                        $scope.config.filter = {
                            type: 'advanced',
                            oql: $scope.search.oql,
                            value: $scope.search.json,
                            headersFilter: $scope.config.filter.headersFilter
                        };
                    }
                    $scope.launchSearching();
                    $scope.filterApplied = true;
                }
            };

            $scope.launchSearchingQuick = function() {
                if (!$scope.filterApplied) {
                    $scope.search.oql = $scope.search.json = '';
                    $scope.config.filter = {
                        type: 'basic',
                        value: $scope.search.quick,
                        headersFilter: $scope.config.filter.headersFilter
                    };
                    $scope.launchSearching();
                    $scope.filterApplied = true;
                }
            };

            $scope.launchSearchingShared = function() {
                // if (!$scope.filterApplied) {
                var shared = $scope.search.id;
                if (shared) {
                    shared.filter.id = shared.wid;
                    $scope.config.filter = shared.filter;
                } else {
                    $scope.config.filter = {};
                }
                $scope.launchSearching();
                $scope.filterApplied = true;
                // }
            };

            $scope.filterSharedSelect = function($item, $model) {
                $scope.filterApplied = false;
                $scope.launchSearchingShared();
            };
            $scope.filterSharedRemove = function($item, $model) {
                $scope.filterApplied = false;
            };

            var windowTimeChanged = $scope.$on('onWindowTimeChanged', function(event, timeObj) {
                $scope.config.windowFilter = timeObj ? timeObj : (config.windowFilter ? {} : timeObj);
                var widget = {
                    definition: definition,
                    element: $element
                };
                $rootScope.$broadcast('adfWindowTimeChangedFromWidget', widget, $scope.config.windowFilter);
                $scope.reload();
            });

            $scope.enter = function(event) {
                var keycode = (event.keyCode ? event.keyCode : event.which);
                if (keycode === 13) {
                    if ($scope.filter.typeFilter === 0)
                        $scope.launchSearchingAdv();
                    if ($scope.filter.typeFilter === 1)
                        $scope.launchSearchingQuick();
                    if ($scope.filter.typeFilter === 2)
                        $scope.launchSearchingShared();
                } else if (keycode === 19) {
                    $scope.filter.showFinalFilter = !$scope.filter.showFinalFilter;
                } else {
                    $scope.filterApplied = false;
                }
            };


            $scope.customSelectors = [];
            $scope.getCustomSelectors = function() {
                if ($scope.config.customSelectors) {
                    $scope.customSelectors = $scope.config.customSelectors;
                } else {
                    config.widgetSelectors().findFields('').then(function(fields) {
                        $scope.customSelectors = fields;
                        $scope.$apply();
                    }).catch(function(err) {
                        $log.error(err);
                    });
                }
            };

            $scope.changeDirection = function() {
                var direction = config.sort.direction;
                if (direction === 'DESCENDING') {
                    $scope.config.sort.direction = 'ASCENDING';
                } else if (direction === 'ASCENDING') {
                    $scope.config.sort.direction = 'DESCENDING';
                }
                $scope.reload();
            };

            $scope.debugQuery = function() {
                Filter.parseQuery($scope.search.oql || '')
                    .then(function(data) {
                        //$scope.elementos = data;
                        $scope.search.json = angular.toJson(data.filter, null, 4); // stringify with 4 spaces at each level;
                        $scope.unknownWords = '';
                        $scope.filter_error = null;
                    })
                    .catch(function(err) {
                        $scope.filter_error = err;
                        // Tratar el error
                    });

            };

            $scope.autocomplete_options = function() {
                var autocomplete_options = {
                    suggest: Filter.suggest_field_delimited,
                    customSelectors: config.widgetSelectors()
                };

                return autocomplete_options;

            };

            // Multiple selection
            $scope.selectedItems = definition.selectedItems || {};

            // Gestor de seleccion
            $scope.selectionManager = {
                currentSelection: $scope.selectedItems,
                isSelected: function(key, obj) {
                    if ($scope.selectedItems[key] && !angular.isUndefined(obj)) {
                        $scope.selectedItems[key].data = obj;
                    }

                    return $scope.selectedItems[key] ? true : false;
                },
                totalSelected: function() {
                    return Object.keys($scope.selectedItems).length;
                }
            };

            if (definition.config.sendSelection) {

                $scope.sendEntities = function() {
                    definition.config.sendSelection($scope.selectedItems);
                    $scope.$parent.closeDialog();
                };

                if (definition.config.selectedItems) {
                    $scope.selectedItems = angular.copy(definition.config.selectedItems);
                }

                $scope.config.selectionManager = $scope.selectionManager;
            }

            $scope.manageSelectedItems = function() {
                var selectionScope = $scope.$new();

                if (definition.config.sendSelection) {
                    delete config.selectionConfig.operationTypes;
                    delete config.selectionConfig.filterTypes;
                }

                selectionScope.selectionConfig = config.selectionConfig;

                selectionScope.selectedItems = [];
                angular.forEach($scope.selectedItems, function(value, key) {
                    selectionScope.selectedItems.push({
                        key: key,
                        value: value
                    });
                });

                selectionScope.currentSelection = {
                    selected: selectionScope.selectedItems
                };

                var manageItemsSelectedTemplate = adfTemplatePath + 'widget-selection.html';
                var opts = {
                    scope: selectionScope,
                    templateUrl: manageItemsSelectedTemplate,
                    backdrop: 'static',
                    size: 'lg',
                    animation: true
                };

                var instance = $uibModal.open(opts);

                selectionScope.restoreSelection = function() {
                    selectionScope.currentSelection = {
                        selected: selectionScope.selectedItems
                    };
                };

                selectionScope.clearSelection = function() {
                    selectionScope.currentSelection.selected = [];
                };

                // Cierra sy guarda los datos de nueva selección
                selectionScope.applyFilter = function(type) {
                    var customOql = selectionScope.selectionConfig.filterAction(selectionScope.currentSelection.selected, type);

                    if (!angular.isUndefined(customOql) && customOql !== null) {
                        $scope.filter.typeFilter = 0;
                        Filter.parseQuery(customOql).then(function(data) {
                            $scope.search.oql = customOql;
                            $scope.search.json = angular.toJson(data.filter, null, 4); // stringify with 4 spaces at each level;
                            $scope.unknownWords = '';
                            $scope.filter_error = null;

                            $scope.launchSearchingAdv();
                        }).catch(function(err) {
                            $scope.filter_error = err;
                        });
                    }
                };

                selectionScope.executeOperation = function(operationType) {
                    if (!$scope.editMode) {
                        $scope.$parent.$broadcast('widgetExecuteOperation', {
                            'selectedItems': selectionScope.currentSelection.selected,
                            'type': operationType
                        });
                    }
                };

                // Cierra sy guarda los datos de nueva selección
                selectionScope.saveChangesDialog = function() {
                    var finalSelection = {};
                    angular.forEach(selectionScope.currentSelection.selected, function(data, idx) {
                        finalSelection[data.key] = {
                            data: data.value.data,
                            visible: data.value.visible
                        };
                    });

                    $scope.selectedItems = angular.copy(finalSelection);
                    $scope.selectedItemsLength = Object.keys($scope.selectedItems).length;

                    $scope.selectionManager.lastItem = {};
                    $scope.$broadcast('widgetSelectionChanged', $scope.selectionManager);

                    instance.close();
                    selectionScope.$destroy();
                };

                // Cierra sin realizar ninguna acción
                selectionScope.closeDialog = function() {
                    instance.close();
                    selectionScope.$destroy();
                };
            };


            // bind edit function
            $scope.edit = function() {
                var editScope = $scope.$new();
                editScope.definition = angular.copy(definition);

                var adfEditTemplatePath = adfTemplatePath + 'widget-edit.html';
                if (definition.editTemplateUrl) {
                    adfEditTemplatePath = definition.editTemplateUrl;
                }

                var opts = {
                    scope: editScope,
                    templateUrl: adfEditTemplatePath,
                    backdrop: 'static',
                    size: 'lg'
                };

                var instance = $uibModal.open(opts);

                editScope.closeDialog = function() {
                    instance.close();
                    editScope.$destroy();
                };

                // TODO create util method
                function createApplyPromise(result) {
                    var promise;
                    if (typeof result === 'boolean') {
                        var deferred = $q.defer();
                        if (result) {
                            deferred.resolve();
                        } else {
                            deferred.reject();
                        }
                        promise = deferred.promise;
                    } else {
                        promise = $q.when(result);
                    }
                    return promise;
                }

                editScope.saveDialog = function() {
                    // clear validation error
                    editScope.validationError = null;

                    // build injection locals
                    var widget = $scope.widget;

                    // create a default apply method for widgets
                    // without edit mode
                    // see issue https://goo.gl/KHPQLZ
                    var applyFn;
                    if (widget.edit) {
                        applyFn = widget.edit.apply;
                    } else {
                        applyFn = function() {
                            return true;
                        };
                    }

                    // injection locals
                    var locals = {
                        widget: widget,
                        definition: editScope.definition,
                        config: editScope.definition.config
                    };

                    // invoke apply function and apply if success
                    var result = $injector.invoke(applyFn, applyFn, locals);
                    createApplyPromise(result).then(function() {
                        definition.title = editScope.definition.title;
                        if (editScope.definition.type === 'summaryChart') {
                            editScope.definition.Ftype = editScope.definition.config.type.toLowerCase();
                            definition.Ftype = editScope.definition.config.type.toLowerCase()
                        }
                        angular.extend(definition.config, editScope.definition.config);

                        editScope.closeDialog();

                        if (widget.edit && widget.edit.reload) {
                            $scope.setReloadTimeout();
                            // reload content after edit dialog is closed
                            $scope.$broadcast('widgetConfigChanged');
                        }
                    }, function(err) {
                        if (err) {
                            editScope.validationError = err;
                        } else {
                            editScope.validationError = 'VALIDATION_DURING_APPLY_FAILED';
                        }
                    });
                };

            };


        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            templateUrl: adfTemplatePath + 'widget-grid.html',
            scope: {
                definition: '=',
                editMode: '=',
                options: '=',
                widgetState: '='
            },
            controller: ["$scope", function($scope) {
                var _setFilterType = function(selectFilter) {
                    var config = $scope.config;
                    var filter = config.filter = config.filter ? config.filter : {};
                    var id = filter.id = selectFilter && filter.id;
                    filter.headersFilter = selectFilter && config.filter.headersFilter;
                    switch (filter.type) {
                        case 'advanced':
                            $scope.filter.typeFilter = id ? 2 : 0;
                            $scope.search = {
                                oql: filter.oql,
                                json: filter.value
                            };
                            break;
                        case 'basic':
                            $scope.filter.typeFilter = id ? 2 : 1;
                            $scope.search = {
                                quick: filter.value
                            };

                            break;
                        default:
                            $scope.filter.typeFilter = id ? 2 : 1;
                            $scope.search = {
                                quick: filter.value = ''
                            };
                            break;
                    }
                    $scope.search.id = selectFilter;
                };

                this.updateWidgetFilters = function(filterId, configChange) {

                    var _widgetFilters = $scope.options.extraData.widgetFilters;
                    var model = $scope.definition;
                    var selectFilter;
                    var sharedFilters = _widgetFilters.filter(function(widgetFilter) {
                        // Recuperamos solos los filtros de widgets que cumplan las condiciones:
                        // - No tenga un filtro heredado como filtro
                        // - El tipo de filtro sea igual que el widget que pueda heredarlo (Ftype)
                        // - No recuperamos el filtro propio del widget  
                        var shared = (!widgetFilter.filter || !widgetFilter.filter.id) && (widgetFilter.Ftype === model.Ftype) && (widgetFilter.wid !== model.wid);
                        if (shared && (filterId === widgetFilter.wid))
                            selectFilter = widgetFilter;
                        return shared;
                    });

                    $scope.sharedFilters = angular.copy(sharedFilters);
                    if (!configChange || !selectFilter && !!filterId)
                        _setFilterType(selectFilter);
                };

                var definition = $scope.definition;


                if (definition.config.selectedItems) {
                    $scope.selectedItemsLength = Object.keys(definition.config.selectedItems).length;
                }


                // Controlador de la barra inferior de los widgets
                $scope.navOptionsHandler = {
                    firstLoad: true,
                    loadingData: false,
                    startLoading: function() {
                        $scope.navOptionsHandler.loadingData = true;
                    },
                    stopLoading: function() {
                        $scope.navOptionsHandler.firstLoad = false;
                        $scope.navOptionsHandler.loadingData = false;
                        $scope.navOptionsHandler.lastMessageTime = new Date();
                    },
                    setStatusMessage: function(message) {
                        $scope.navOptionsHandler.statusMessage = message;
                        $scope.navOptionsHandler.lastMessageTime = new Date();
                    }
                };

                // Controlador de los parámetros del filtro
                $scope.filterHandler = {
                    changeFilter: function(filter, search, typeFilter) {
                        $scope.search = search;
                        $scope.filter.typeFilter = typeFilter;
                    }
                };

                // Controlador de las custom actions del widget
                $scope.widgetActionsHandler = {
                    actions: [],
                    setActions: function(actions) {
                        $scope.widgetActionsHandler.actions = actions;
                    }
                };

                var adfDashboardCollapseExpand = $scope.$on('adfDashboardCollapseExpand', function(event, args) {
                    $scope.widgetState.isCollapsed = args.collapseExpandStatus;
                });

                var adfWidgetEnterEditMode = $scope.$on('adfWidgetEnterEditMode', function(event, widget) {
                    if (dashboard.idEquals(definition.wid, widget.wid)) {
                        $scope.edit();
                    }
                });

                var adfIsEditMode = $scope.$on('adfIsEditMode', function(event, widget) {
                    $scope.editing = true;
                });

                var adfDashboardChanged = $scope.$on('adfDashboardChanged', function(event, name, model) {
                    //config.widgetSelectors = tiene filtro
                    var widgetConfigChanged = [];
                    var grid = model.grid;
                    if (grid && grid.length > 0) {
                        grid.forEach(function(element) {
                            var definition = element.definition;
                            widgetConfigChanged.push(definition.wid);
                        });
                        var widgetFilters = $scope.options.extraData && $scope.options.extraData.widgetFilters;
                        var sharedFilters = widgetFilters.filter(function(widgetFilter) {
                            var filter = widgetFilter.filter;
                            return filter && !filter.id || widgetConfigChanged.indexOf(filter.id) !== -1;
                        });
                        $scope.sharedFilters = angular.copy(sharedFilters);
                        $scope.editing = false;
                        $scope.$broadcast('widgetConfigChanged', widgetConfigChanged);
                    }
                });

                var adfDashboardEditsCancelled = $scope.$on('adfDashboardEditsCancelled', function(event, widget) {
                    $scope.editing = false;
                });

                $scope.openFullScreen = function() {

                    $scope.$emit('adfOpenModalWidgetFromOther', definition.type, $scope.config);
                };

                $scope.openAboutScreen = function(size) {
                    size = 'md';
                    var modalInstance = $uibModal.open({
                        animation: true,
                        templateUrl: 'widgetAboutModal.html',
                        controller: ["$scope", "$uibModalInstance", "information", function($scope, $uibModalInstance, information) {
                            $scope.about = {};
                            $scope.about.info = information;
                            $scope.ok = function() {
                                $uibModalInstance.close();
                            };
                        }],
                        'size': size,
                        resolve: {
                            information: function() {
                                return $scope.config.about;
                            }
                        }
                    });

                    modalInstance.result.then(function(selectedItem) {
                        $scope.selected = selectedItem;
                    }, function() {
                        $log.info('Modal dismissed at: ' + new Date());
                    });
                };

                $scope.saveWidgetScreen = function(wId) {
                    $scope.$emit('generateSnapshot', {
                        'objectSelector': '.widget_' + wId,
                        'fileName': 'capture_' + new Date().getTime()
                    });
                };

                var createQuickFilter = function(fieldsQuickSearch) {
                    var _filter = {
                        or: []
                    };
                    var criteria;
                    fieldsQuickSearch.forEach(function(field) {
                        criteria = {};
                        criteria[field.operator] = {};
                        criteria[field.operator][field.name] = $scope.config.filter.value;
                        _filter.or.push(criteria);
                    });
                    return _filter;
                };

                $scope.downloadCsv = function() {
                    var columns = $scope.config.columns;
                    var scope_filter = $scope.config.filter;
                    var extra_filter;
                    var final_filter = {};
                    var order = $scope.config.sort ? $scope.config.sort : undefined;
                    if ($scope.config.windowFilter) {
                        var window_filter = $scope.config.onWindowTimeChanged($scope.config.windowFilter);
                        if (window_filter && window_filter.and) {
                            extra_filter = {
                                and: window_filter.and
                            };
                        }
                    }
                    var filter;
                    if (scope_filter.type && scope_filter.type === 'advanced' && scope_filter.value.length > 4) {
                        filter = JSON.parse(scope_filter.value);
                    } else if (scope_filter.type && scope_filter.type === 'basic' && scope_filter.value.trim() !== '') {
                        filter = createQuickFilter($scope.config.fieldsQuickSearch, scope_filter.value);
                    }
                    if (extra_filter) {
                        if (filter) {
                            final_filter = {
                                and: [extra_filter, filter]
                            };
                        } else {
                            final_filter = extra_filter;
                        }
                    } else {
                        final_filter = filter;
                    }
                    $scope.$broadcast('downloadCsv', {
                        'columns': columns,
                        'filter': final_filter,
                        'order': order
                    });
                };

                $scope.generateQR = function() {
                    $scope.$broadcast('generateQR');
                };

                var addItemToSelection = $scope.$on('addItemToSelection', function(event, item) {
                    if (!$scope.selectedItems[item.key]) {
                        $scope.selectedItems[item.key] = {
                            data: item.data,
                            visible: item.visible
                        };
                        $scope.selectedItemsLength = Object.keys($scope.selectedItems).length;
                        item.isSelected = true;
                        $scope.selectionManager.lastItem = item;
                        $scope.$broadcast('widgetSelectionChanged', $scope.selectionManager);
                    }

                });

                var removeItemFromSelection = $scope.$on('removeItemFromSelection', function(event, item) {
                    if ($scope.selectedItems[item.key]) {
                        delete $scope.selectedItems[item.key];
                        $scope.selectedItemsLength = Object.keys($scope.selectedItems).length;
                        item.isSelected = false;
                        $scope.selectionManager.lastItem = item;
                        $scope.$broadcast('widgetSelectionChanged', $scope.selectionManager);
                    }
                });

                // bind reload function
                var stopReloadTimeout;

                $scope.setReloadTimeout = function() {
                    var config = $scope.config || $scope.definition.config;

                    if (config) {
                        var reloadPeriod = config.reloadPeriod;
                        if (!isNaN(reloadPeriod) && (reloadPeriod * 1) !== 0) {
                            if (angular.isDefined(stopReloadTimeout)) {
                                $interval.cancel(stopReloadTimeout);
                                stopReloadTimeout = undefined;
                            }
                            stopReloadTimeout = $interval($scope.reload, (reloadPeriod * 1000));
                        } else if (stopReloadTimeout) {
                            $interval.cancel(stopReloadTimeout);
                        }
                    }
                };

                $scope.reload = function() {
                    $scope.$broadcast('widgetReload');

                    $scope.setReloadTimeout();
                };

                // verificacion de periodo de refresco
                $scope.setReloadTimeout();

                $scope.$on('$destroy', function() {
                    adfDashboardCollapseExpand();
                    adfWidgetEnterEditMode();
                    adfIsEditMode();
                    adfDashboardChanged();
                    adfDashboardEditsCancelled();
                    addItemToSelection();
                    removeItemFromSelection();
                    $interval.cancel(stopReloadTimeout);
                });
            }],
            compile: function() {

                /**
                 * use pre link, because link of widget-content
                 * is executed before post link widget
                 */
                return {
                    pre: preLink,
                    post: postLink
                };
            }
        };

    }]);

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
 * The widget service provide helper functions to render widgets and their content.
 */
angular.module('adf')
  .factory('widgetService', ["$http", "$q", "$sce", "$templateCache", "dashboard", function($http, $q, $sce, $templateCache, dashboard) {
    

    function parseUrl(url) {
      var parsedUrl = url;
      if (url.indexOf('{widgetsPath}') >= 0) {
        parsedUrl = url.replace('{widgetsPath}', dashboard.widgetsPath)
                .replace('//', '/');
        if (parsedUrl.indexOf('/') === 0) {
          parsedUrl = parsedUrl.substring(1);
        }
      }
      return parsedUrl;
    }

    var exposed = {};

    exposed.getTemplate = function(widget){
      var deferred = $q.defer();

      if (widget.template) {
        deferred.resolve(widget.template);
      } else if (widget.templateUrl) {
        // try to fetch template from cache
        var tpl = $templateCache.get(widget.templateUrl);
        if (tpl) {
          deferred.resolve(tpl);
        } else {
          var url = $sce.getTrustedResourceUrl(parseUrl(widget.templateUrl));
          $http.get(url)
               .success(function(response) {
                 // put response to cache, with unmodified url as key
                 $templateCache.put(widget.templateUrl, response);
                 deferred.resolve(response);
               })
               .error(function() {
                 deferred.reject('could not load template');
               });
        }
      }

      return deferred.promise;
    };

    return exposed;
  }]);

angular.module("adf").run(["$templateCache", function($templateCache) {$templateCache.put("../src/templates/dashboard-edit.html","<div class=modal-header> <button type=button class=close ng-click=closeDialog() aria-hidden=true>&times;</button> <h3 class=modal-title translate>ADF.DASHBOARD.TITLE.EDIT.DASHBOARD</h3> </div> <div class=modal-body> <form role=form name=form novalidate> <div class=\"form-group col-xs-12 col-md-6\"> <label for=dashboardTitle translate>ADF.COMMON.TITLE</label> <input type=text class=\"form-control text-primary\" id=dashboardTitle ng-model=copy.title required ng-init=\"copy.title=(copy.title | translate)\"> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=dashboardDescription translate>ADF.DASHBOARD.LABEL.DESCRIPTION</label> <input type=text class=\"form-control text-primary\" id=dashboardDescription ng-init=\"copy.description=(copy.description | translate)\" ng-model=copy.description> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=iconConfiguration.model class=text-primary>{{\'ADF.DASHBOARD.LABEL.ICON\' | translate }} </label> <div class=\"radio radio-primary\"> <label id=icon_library> <input type=radio name=iconLibrary ng-model=iconConfiguration.model value=icon> <span class=circle></span> <span class=check></span> {{\'ICON.LIBRARY\' | translate }} </label> </div> <div class=radio-options> <ui-select ng-disabled=\"iconConfiguration.model !== \'icon\'\" tagging=tagTransform id=icon ng-model=iconConfiguration.icon theme=bootstrap allow-clear=false on-select=selectIcon($select.selected) title=\"{{\'ADF.WIDGET.TITLE.CHOOSE_ICON\' | translate}}\"> <ui-select-match placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.ICON\' | translate}}\" allow-clear=false> <i class=\"fa {{$select.selected}} fa-2x\"></i> <span>{{$select.selected}}</span> </ui-select-match> <ui-select-choices class=oux-icon-selector repeat=\"iconTmp in availableIcons | filter: $select.search\"> <i class=\"fa fa-4x\" ng-class=iconTmp title={{iconTmp}}></i> <br> <span ng-bind-html=\"iconTmp| highlight: $select.search\"></span> </ui-select-choices> </ui-select> <input type=hidden ng-model=iconConfiguration.icon required=\"iconConfiguration.model === \'icon\'\"> </div> <div class=\"radio radio-primary\"> <label id=icon_image> <input type=radio name=iconImage ng-model=iconConfiguration.model value=image> <span class=circle></span> <span class=check></span> {{\'ICON.IMAGE\' | translate }} </label> </div> <div class=radio-options> <div class=col-xs-12 ng-disabled=\"iconConfiguration.model !== \'image\'\"> <div ng-disabled=\"iconConfiguration.model !== \'image\'\" ng-if=!iconConfiguration.url ngf-drop ng-model=iconConfiguration.file ngf-max-size=1MB ngf-select=imageSelected($file) class=\"drop-box pointer\" ngf-drag-over-class=\"\'dragover\'\" ngf-multiple=false ngf-accept=\"\'image/*\'\" ngf-pattern=\"\'image/*\'\">{{ \'FORM.DRAG_DROP\' | translate }}<br>{{ \'FORM.MAX_SIZE\' | translate }}</div> <img ng-if=iconConfiguration.url class=navbar-domain src=\"{{ iconConfiguration.url }}\" data-intro=\"{{ \'HELP.HEADER.DOMAIN_LOGO\' | translate }}\" data-position=fixed> <input ng-if=\"iconConfiguration.model === \'image\'\" type=hidden ng-model=iconConfiguration.url required> </div> <div class=col-xs-12 ng-if=iconConfiguration.url> <button id=idRemoveFileLink ng-click=removeDataFile() class=\"btn btn-warning ux-txt-warning btn-group-justified pointer\"><i class=\"fa fa-trash\" aria-hidden=true></i> {{ \'BUTTON.TITLE.REMOVE\' | translate }}</button> </div> </div> <input type=hidden ng-model=iconConfiguration.model required> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=dashboardBackground translate>ADF.DASHBOARD.LABEL.BACKGROUND_COLOR</label> <input type=text placeholder=\"{{ \'ADF.WIDGET.PLACEHOLDER.COLOR\' | translate }}\" colorpicker=hex class=\"form-control {{stream.identifier}}_color\" ng-model=copy.backgroundColor> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=dashboardBackground translate>ADF.DASHBOARD.LABEL.BACKGROUND_IMAGE</label> <div class=\"col-xs-12 col-md-12\"> <div ng-if=!copy.backgroundImage ngf-drop ng-model=copy.file ngf-max-size=1MB ngf-select=backgroundImageSelected($file) class=\"drop-box pointer\" ngf-drag-over-class=\"\'dragover\'\" ngf-multiple=false ngf-accept=\"\'image/*\'\" ngf-pattern=\"\'image/*\'\">{{ \'FORM.DRAG_DROP\' | translate }}<br>{{ \'FORM.MAX_SIZE\' | translate }}</div> <img ng-if=copy.backgroundImage class=navbar-domain src=\"{{ copy.backgroundImage }}\" data-intro=\"{{ \'HELP.HEADER.DOMAIN_LOGO\' | translate }}\" data-position=fixed> </div> <div class=col-xs-12 ng-if=copy.backgroundImage> <button id=idRemoveBackgroundImageFileLink ng-click=removeBackgroundFile() class=\"btn btn-warning ux-txt-warning btn-group-justified pointer\"><i class=\"fa fa-trash\" aria-hidden=true></i> {{ \'BUTTON.TITLE.REMOVE\' | translate }}</button> </div> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=BACKGROUND_SIZE class=text-primary>{{\'ADF.DASHBOARD.LABEL.BACKGROUND_SIZE\' | translate }} <field-options required=true></field-options></label> <wizard-radio info=backgroundSize></wizard-radio> <input type=hidden ng-model=backgroundSize.model required> </div> <div class=\"form-group col-xs-12 col-md-12\"> <b><p>{{\'DIALOG.ICON.PREVIEW\' | translate}}</p></b> <div class=\"col-xs-12 col-md-3\"> </div> <div class=\"col-xs-12 col-md-9 dashboardPanel\"> <div gridstack class=grid-stack> <div gridstack-item class=grid-stack-item gs-item-x=0 gs-item-y=0 gs-item-width=5 gs-item-height=2 gs-item-min-width=2 gs-item-min-height=1 gs-item-autopos=0 data-intro=\"{{ \'HELP.WORKSPACES.DASHBOARD\' | translate }}\" data-position=absolute> <div class=\"grid-stack-item-content panel well no-padding\" style=\"background-color: {{copy.backgroundColor}} !important; background-image: url( {{copy.backgroundImage }} ); background-size : {{backgroundSize.model }}\" title=\"{{ copy.title | translate }}\"> <div class=\"col-xs-12 col-md-12 padding-5\"> <h4 class=\"text-primary no-margin\">{{ copy.title | translate }}</h4> <small ng-if=copy.description>{{ copy.description | translate }}</small> </div> <div class=dashboard-extra-info> <div class=\"padding-5 extra-info\"> <span><i class=\"fa fa-clock-o text-grey\"></i> <small am-time-ago=copy.time> {{copy.time}}</small></span> </div> <div class=\"padding-5 identity-icon-dashboard\"> <i ng-if=\"iconConfiguration.model === \'icon\'\" class=\"fa {{ iconConfiguration.icon}}\"></i> <img ng-if=\"iconConfiguration.model === \'image\'\" alt src=\"{{ iconConfiguration.url }}\" data-intro=\"{{ \'HELP.HEADER.DOMAIN_LOGO\' | translate }}\" data-position=fixed> </div> </div> </div> </div> </div> </div> </div> </form> </div> <div class=modal-footer> <div class=col-xs-12> <button type=submit class=\"btn btn-primary\" ng-click=closeDialog() ng-disabled=form.$invalid translate>ADF.COMMON.CLOSE</button> </div> </div>");
$templateCache.put("../src/templates/dashboard-grid.html","<div gridstack class=grid-stack options=gridOptions on-drag-start=onDragStart(event,ui) on-drag-stop=onDragStop(event,ui) on-resize-start=onResizeStart(event,ui) on-resize-stop=onResizeStop(event,ui) gridstack-handler=gsHandler on-change=onChange(event,items)> <div gridstack-item ng-repeat=\"w in adfModel.grid\" class=grid-stack-item gs-item-x=w.x gs-item-y=w.y gs-item-width=w.width gs-item-height=w.height gs-item-min-width=2 gs-item-min-height=2 gs-item-autopos=0> <adf-widget-grid ng-if=\"w && w.definition\" class=grid-stack-item-content options=options definition=w.definition edit-mode=editMode widget-state=widgetState></adf-widget-grid> </div> </div>");
$templateCache.put("../src/templates/dashboard-title.html","<div class=row style=padding:0px;> <div class=\"col-xs-12 col-md-5\" ng-if=!hideButtons> <span ng-if=model.icon id=idDashboardIcon class=\"fa fa-2x\" ng-class=model.icon></span> <span id=idDashboardTitle class=\"fa-2x text-primary\">{{model.title | translate}}</span> <span ng-if=model.description id=idDashboardDescription>{{model.description | translate}}</span> </div> <div class=\"col-xs-12 col-md-7 text-right\" ng-if=!hideButtons> <a href ng-if=editMode title=\"{{ \'ADF.DASHBOARD.TITLE.ADD\' | translate }}\" ng-click=addWidgetDialog() class=\"btn btn-sm pointer no-transition\"> <i class=\"fa fa-plus\" aria-hidden=true></i> {{\'ADF.DASHBOARD.TITLE.ADD\' | translate}} </a> <a href ng-if=editMode title=\"{{ \'ADF.DASHBOARD.TITLE.CONFIGURATION\' | translate }}\" ng-click=editDashboardDialog() class=\"btn btn-sm pointer no-transition\"> <i class=\"fa fa-cog\"></i> {{\'ADF.DASHBOARD.TITLE.CONFIGURATION\' | translate}} </a> <a href ng-if=editMode title=\"{{ \'ADF.DASHBOARD.TITLE.UNDO\' | translate }}\" ng-click=cancelEditMode() class=\"btn btn-warning btn-sm pointer no-transition\"> <i class=\"fa fa-close\"></i> {{\'ADF.DASHBOARD.TITLE.UNDO\' | translate}} </a> <a href ng-if=\"options.editable && !editMode && !model.temporal\" title=\"{{\'ADF.DASHBOARD.TITLE.EDIT.MODE\' | translate }}\" ng-click=toggleEditMode() class=\"btn btn-sm pointer no-transition\"> <i class=\"fa fa-pencil-square-o\"></i> {{\'ADF.DASHBOARD.TITLE.EDIT.MODE\' | translate}} </a> <a href ng-if=\"options.editable && editMode\" title=\"{{\'ADF.DASHBOARD.TITLE.SAVE\' | translate)}}\" ng-click=toggleEditMode() class=\"btn btn-success btn-sm pointer no-transition\"> <i class=\"fa fa-save\"></i> {{\'ADF.DASHBOARD.TITLE.SAVE\' | translate}} </a> </div> </div>");
$templateCache.put("../src/templates/dashboard.html","<div class=dashboard-container x-ng-class=\"{\'edit\' : editMode}\"> <div ng-include src=model.titleTemplateUrl></div> <div class=dashboard x-ng-class=\"{\'edit\' : editMode}\" style=\"padding: 0px;margin: 0px;\"> <adf-dashboard-grid ng-if=model.grid adf-model=model options=options edit-mode=editMode> </adf-dashboard-grid></div> </div>");
$templateCache.put("../src/templates/widget-add.html","<div class=modal-header> <button type=button class=close ng-click=closeDialog() aria-hidden=true>&times;</button> <h4 class=modal-title translate>ADF.WIDGET.TITLE.ADD_HEADER</h4> </div> <div class=modal-body>  <div ng-if=createCategories> <uib-accordion ng-init=\"categorized = createCategories(widgets)\"> <div uib-accordion-group heading=\"{{category.name | translate}}\" ng-repeat=\"category in categorized | adfOrderByObjectKey: \'name\'\"> <dl class=dl-horizontal> <dt ng-repeat-start=\"widget in category.widgets | adfOrderByObjectKey: \'key\'\"> <a href ng-click=addWidget(widget.key) ng-class={{widget.key}}> {{widget.title | translate}} </a> </dt> <dd ng-repeat-end ng-if=widget.description> {{widget.description | translate}} </dd> </dl> </div> </uib-accordion> </div>  <div ng-if=!createCategories> <div class=row> <div class=\"col-md-4 col-xs-12 form-group no-margin\"> <select ng-model=widgetFilterCfg.widgetFilter.categoryTags name=widgetsCategoryFilter class=form-control> <option value translate>ADF.WIDGET.LABEL.ALL_WIDGETS</option> <option ng-repeat=\"category in availableCategories | orderBy\" value={{category}}>{{ category | translate }}</option> </select> </div> <div class=\"col-md-4 col-xs-12 form-group no-margin\"> <select ng-model=widgetFilterCfg.widgetSorting name=widgetsSorting class=form-control> <option value=priority ng-selected=\"widgetFilterCfg.widgetSorting===\'priority\' || !widgetFilterCfg.widgetSorting\" translate=ADF.WIDGET.TITLE.SORTED_BY translate-values=\"{ item : (\'ADF.WIDGET.LABEL.PRIORITY\' | translate) }\"></option> <option value=name ng-selected=\"widgetFilterCfg.widgetSorting===\'name\'\" translate=ADF.WIDGET.TITLE.SORTED_BY translate-values=\"{ item : (\'ADF.WIDGET.LABEL.NAME\' | translate) }\"></option> <option value=category ng-selected=\"widgetFilterCfg.widgetSorting===\'category\'\" translate=ADF.WIDGET.TITLE.SORTED_BY translate-values=\"{ item : (\'ADF.WIDGET.LABEL.CATEGORY\' | translate) }\"></option> <option value=description ng-selected=\"widgetFilterCfg.widgetSorting===\'description\'\" translate=ADF.WIDGET.TITLE.SORTED_BY translate-values=\"{ item : (\'ADF.WIDGET.LABEL.DESCRIPTION\' | translate) }\"></option> </select> </div> <div class=\"col-md-4 col-xs-12 form-group no-margin\"> <select ng-model=widgetFilterCfg.widgetSortingDirection name=widgetSortingDirection class=form-control> <option value translate>BUTTON.TITLE.ASCENDING</option> <option value=1 translate>BUTTON.TITLE.DESCENDING</option> </select> </div> </div> <div class=row> <div class=\"col-xs-12 form-group no-margin\"> <input type=text class=form-control name=widgetsTitleFilter autofocus ng-model=widgetFilterCfg.widgetFilter.title placeholder=\"{{ \'ADF.WIDGET.PLACEHOLDER.TYPE_WIDGET_FILTER\'| translate }}\"> </div> </div> <div ng-repeat=\"widget in widgets | adfOrderByObjectKey: \'key\' | filter:widgetFilterCfg.widgetFilter:strict | orderBy:widgetFilterCfg.widgetSorting:widgetFilterCfg.widgetSortingDirection track by $index\" ng-class=\"{ \'widgetPanelBig\' : $index ===0 , \'widgetPanelNormal\' : $index > 0 }\"> <div class=\"pointer panel widgetInfoParent {{widget.key}}\" ng-click=addWidget(widget.key) title=\"{{widget.description | translate}}\"> <div class=\"widgetInfoImage pointer\"> <div ng-if=widget.svg class=widget-icon ng-include=widget.svg></div> <img ng-if=\"widget.images && !widget.svg\" ng-init=\"widget._currImg = widget.images[0]\" src=\"{{ widget._currImg }}\" ng-click=addWidget(widget.key) title=\"Click to change (if available)\"> <i ng-if=\"!widget.images && !widget.svg\" class=\"widgetInfoIcon fa\" ng-class=\"widget.icon ? widget.icon: \'fa-plus-circle\'\" ng-style=\"widget.color?{\'color\':widget.color}:\'\'\" aria-hidden=true></i> </div> <div class=widgetInfoContainer id=widgetKey_{{widget.key}} ng-class=\"{ \'bg-contrast\' : $index ===0, \'bg-primary\': $index !== 0}\">  <span class=widgetInfoTitle>{{widget.title }}</span><br> <span>({{widget.category}})</span> <span class=widgetInfoDescription>{{widget.description}}</span> </div> </div> </div> </div> </div> <div class=modal-footer style=clear:both;> <button type=button class=\"btn btn-primary\" ng-click=closeDialog() translate>ADF.COMMON.CLOSE</button> </div>");
$templateCache.put("../src/templates/widget-delete.html","<div class=modal-header> <h4 class=modal-title> <span translate>ADF.COMMON.DELETE</span> {{widget.title | translate}}</h4> </div> <div class=modal-body> <form role=form> <div class=form-group> <label for=widgetTitle translate>ADF.WIDGET.LABEL.DELETE_CONFIRM_MESSAGE</label> </div> </form> </div> <div class=modal-footer> <button type=button class=\"btn btn-default\" ng-click=closeDialog() translate>ADF.COMMON.CLOSE</button> <button type=button class=\"btn btn-primary\" ng-click=deleteDialog() translate>ADF.COMMON.DELETE</button> </div> ");
$templateCache.put("../src/templates/widget-edit.html","<form name=widgetEditForm novalidate role=form ng-submit=saveDialog()> <div class=modal-header> <button type=button class=close ng-click=closeDialog() aria-hidden=true>&times;</button> <h3 class=modal-title>{{widget.title | translate}}</h3> </div> <div class=modal-body> <div class=row> <div class=col-xs-12> <div class=\"alert alert-danger\" role=alert ng-show=validationError> <strong translate>ADF.ERROR.APPLY_ERROR</strong> {{validationError | translate}} </div> </div> </div> <div class=row ng-if=widget.show_reload_config> <div class=\"col-xs-12 col-md-6\"> <div class=form-group> <label for=widgetTitle translate>ADF.COMMON.TITLE</label> <input type=text class=\"form-control text-primary\" id=widgetTitle ng-init=\"definition.title=(definition.title | translate)\" ng-model=definition.title placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.TITLE\' | translate}}\"> </div> </div> <div class=\"col-xs-12 col-md-6\"> <div class=form-group> <label for=widgetReloadPeriod translate>ADF.WIDGET.TOOLTIP.REFRESH</label> <select class=form-control id=widgetReloadPeriod aria-label=\"ngSelected demo\" ng-model=definition.config.reloadPeriod required ng-init=\"definition.config.reloadPeriod ? definition.config.reloadPeriod : (definition.config.reloadPeriod = \'0\')\"> <option value=0 translate>ADF.WIDGET.OPTIONS.MANUAL</option> <option value=20 translate>ADF.WIDGET.OPTIONS.20_SECONDS</option> <option value=40 translate>ADF.WIDGET.OPTIONS.40_SECONDS</option> <option value=60 translate>ADF.WIDGET.OPTIONS.EVERY_MINUTE</option> </select> </div> </div> </div> <div class=row ng-if=!widget.show_reload_config> <div class=\"col-xs-12 col-md-12\"> <div class=form-group> <label for=widgetTitle translate>ADF.COMMON.TITLE</label> <input type=text class=\"form-control text-primary\" id=widgetTitle ng-init=\"definition.title=(definition.title | translate)\" ng-model=definition.title placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.TITLE\' | translate}}\"> </div> </div> </div> <div ng-if=widget.edit class=row> <div class=col-xs-12> <adf-widget-content model=definition content=widget.edit> </adf-widget-content></div> </div> <div class=row> <div class=col-xs-12> <div class=form-group> <label for=widgetAbout translate>ADF.COMMON.ABOUT</label> <textarea class=\"form-control text-primary\" id=widgetAbout ng-model=definition.config.about placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.ENTER.DESCRIPTION\'|translate}}\"></textarea> </div> </div> </div> </div> <div class=modal-footer> <button type=button class=\"btn btn-default\" ng-click=closeDialog() translate>ADF.WIDGET.BUTTON.CANCEL</button> <button type=submit class=\"btn btn-primary\" ng-disabled=widgetEditForm.$invalid value=\"{{\'ADF.WIDGET.BUTTON.APPLY\' | translate }}\" translate>ADF.WIDGET.BUTTON.APPLY</button> </div> </form>");
$templateCache.put("../src/templates/widget-fullscreen-selection.html","<div class=modal-header> <div class=\"pull-right widget-icons\"> <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.CLOSE\' |translate }}\" ng-click=closeDialog() class=\"btn btn-xs btn-danger oux-button-margin\"> <i class=\"glyphicon glyphicon-remove\"></i> {{ \'ADF.WIDGET.TOOLTIP.CLOSE\' |translate }} </a> </div> <h4 class=\"modal-title pull-left\" translate>&nbsp;{{ definition.title | translate}}</h4> </div> <div class=\"modal-body widget\" style=overflow:hidden;> <adf-widget-grid definition=definition edit-mode=false widget-state=widgetState></adf-widget-grid> </div> ");
$templateCache.put("../src/templates/widget-fullscreen.html","<div class=modal-header> <div class=\"pull-right widget-icons\"> <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.CLOSE\' |translate }}\" ng-click=closeDialog() class=\"btn btn-xs btn-danger oux-button-margin\"> <i class=\"glyphicon glyphicon-remove\"></i> {{ \'ADF.WIDGET.TOOLTIP.CLOSE\' |translate }} </a> <a permission permission-only=\"\'manageWorkspace\'\" href title=\"{{ \'ADF.WIDGET.TOOLTIP.INSERT\' |translate }}\" ng-if=persistDashboard ng-click=persistDashboard() class=\"btn btn-xs btn-primary oux-button-margin\"> <i class=\"glyphicon glyphicon-save\"></i> {{ \'ADF.WIDGET.TOOLTIP.INSERT\' |translate }} </a> </div> <h4 class=\"modal-title pull-left\" translate>&nbsp;{{ definition.title | translate}}</h4> </div> <div class=\"modal-body widget\" style=overflow:hidden;>  <adf-widget-grid definition=definition edit-mode=false widget-state=widgetState></adf-widget-grid> </div> <div class=modal-footer ng-if=widget.show_modal_footer> <button type=button class=\"btn btn-primary\" ng-click=closeDialog() translate>ADF.COMMON.CLOSE</button> </div>");
$templateCache.put("../src/templates/widget-grid-title.html","<div class=panel-title style=margin:0px;> <div class=\"pull-right container-actions bg-primary\" data-intro=\"Widget actions\" data-position=bottom> <span ng-if=config.about> <a href uib-popover=\"{{ config.about }}\" popover-trigger=\"\'mouseenter\'\" popover-placement=top ng-click=openAboutScreen()> <i class=\"glyphicon glyphicon-info-sign\"></i> </a> <script type=text/ng-template id=widgetAboutModal.html> <div class=\"modal-header\"> <h4 class=\"modal-title\" translate>ADF.COMMON.ABOUT</h4> </div> <div class=\"modal-body\">{{ about.info }}</div> <div class=\"modal-footer\"> <button class=\"btn btn-primary\" type=\"button\" ng-click=\"ok()\" translate>ADF.WIDGET.BUTTON.OK</button> </div> </script> </span> <a ng-if=\"!editMode && widget.print\" href title=\"{{ \'ADF.WIDGET.TOOLTIP.PRINT\' | translate }}\" ng-click=print()> <i class=\"glyphicon glyphicon-print\"></i> </a> <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.REFRESH\' | translate }}\" ng-if=widget.reload ng-click=reload()> <i class=\"glyphicon glyphicon-refresh\"></i> </a>  <a permission permission-only=\"\'viewFilter\'\" href title=\"{{ \'ADF.WIDGET.TOOLTIP.FILTER\' | translate }}\" ng-if=\"config.widgetSelectors && !editMode\" ng-click=\"filter.showFilter = !filter.showFilter\"> <i class=\"glyphicon glyphicon-filter\" ng-class=\"{\'active\': search.json || search.oql|| search.quick}\"></i> </a>  <a permission permission-only=\"\'viewFilter\'\" href title=\"{{ \'ADF.WIDGET.TOOLTIP.SORT\' | translate }}\" ng-if=\"config.sort && !editMode\" ng-click=\"filter.showFilter = !filter.showFilter\"> <i class=\"glyphicon glyphicon-sort\" ng-class=\"{\'active\': (config.sort.value && config.sort.value !== \'\')}\"></i> </a>  <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.EDIT\' | translate }}\" ng-click=edit() ng-if=editMode> <i class=\"glyphicon glyphicon-cog\"></i> </a> <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.FULLSCREEN\' | translate }}\" ng-click=openFullScreen() ng-show=\"options.maximizable && !widget.notMaximizable\"> <i class=\"glyphicon glyphicon-fullscreen\"></i> </a>  <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.REMOVE\' | translate}}\" ng-click=remove() ng-if=editMode> <i class=\"glyphicon glyphicon-trash\"></i> </a> <div ng-if=!editMode class=pointer style=\"display: inline;\" uib-dropdown uib-dropdown-toggle> <i class=\"fa fa-ellipsis-h\" style=font-size:1.2em;></i> <ul uib-dropdown-menu class=dropdown-menu-right> <li role=menuitem> <a class=pointer href title=\"{{ \'ADF.WIDGET.TOOLTIP.PICTURE\' | translate}}\" ng-click=saveWidgetScreen(definition.wid)> <span class=\"glyphicon glyphicon-picture\"></span> {{ \'ADF.WIDGET.TOOLTIP.PICTURE\' | translate}} </a> </li> <li role=menuitem ng-if=widget.qr> <a class=pointer href title=\"{{ \'ADF.WIDGET.TOOLTIP.QR\' | translate }}\" ng-click=generateQR()> <span class=\"fa fa-qrcode\" style=\"font-size: 1.1em;\"></span> {{ \'ADF.WIDGET.TOOLTIP.QR\' | translate }} </a> </li> <li ng-if=widget.csv permission permission-only=\"\'download\'\" role=menuitem> <a class=pointer href title=\"{{ \'ADF.WIDGET.TOOLTIP.CSV\' | translate }}\" ng-click=downloadCsv()> <span class=\"glyphicon glyphicon-file\"></span> {{ \'ADF.WIDGET.TOOLTIP.CSV\' | translate }} </a> </li> <li role=menuitem permission permission-only=\"\'executeOperation\'\" ng-if=\"widget.executeOperation && isExecuteOperationEnabled()\"> <a class=pointer href title=\"{{ \'ADF.WIDGET.TOOLTIP.OPERATION\' | translate }}\" ng-click=executeOperation()> <span class=\"glyphicon glyphicon-flash\"></span> {{ \'ADF.WIDGET.TOOLTIP.OPERATION\' | translate }} </a> </li> <li role=menuitem ng-if=\"widgetActionsHandler && widgetActionsHandler.actions && widgetActionsHandler.actions.length > 0\" ng-repeat=\"customAction in widgetActionsHandler.actions\" permission permission-only=customAction.permissions> <a class=pointer title={{customAction.title}} ng-click=customAction.action(choice.value)> <span class=\"pointer {{customAction.icon}}\"></span> {{customAction.title}} </a> </li> </ul> </div> </div> <span class=pull-left>  <h4 ng-if=\"!widget.frameless && definition.title\" style=\"margin:4px 0px 0px 2px;float:left;\" translate class=text-primary>{{definition.title | translate}}</h4> </span> <div class=pull-right ng-if=\"navOptionsHandler.prevPage && navOptionsHandler.nextPage && navOptionsHandler.hasPrevPage && navOptionsHandler.hasNextPage && ( !navOptionsHandler.isPaginationEnable || navOptionsHandler.isPaginationEnable() ) && ( !navOptionsHandler.isNoContent || !navOptionsHandler.isNoContent() )\" style=margin-top:1px> <button class=\"btn btn-primary btn-sm pointer\" ng-click=navOptionsHandler.prevPage() ng-disabled=!navOptionsHandler.hasPrevPage()> <i class=\"glyphicon glyphicon-chevron-left browser-link\"></i>{{ \'BUTTON.TITLE.PREVIOUS\' | translate }} </button> <button class=\"btn btn-primary btn-sm pointer\" ng-click=navOptionsHandler.nextPage() ng-disabled=!navOptionsHandler.hasNextPage()> {{ \'BUTTON.TITLE.NEXT\' | translate }} <i class=\"glyphicon glyphicon-chevron-right browser-link\"></i> </button> </div> <div permission permission-only=\"[\'viewFilter\',\'executeOperation\']\" class=pull-right ng-if=\"selectedItemsLength > 0\" style=margin-top:1px> <a href title=\"{{ \'ADF.WIDGET.TOOLTIP.SELECTION\' | translate }}\" ng-click=manageSelectedItems() class=\"btn btn-primary btn-sm pointer\"> <i class=\"glyphicon glyphicon-check\"></i> <small class=ogux-budget>{{ selectedItemsLength }}</small> </a> </div> </div> <script type=text/ng-template id=actionsMenuTpl.html> <ul class=\"dropdown-menu\" uib-dropdown-menu role=\"menu\"> <li> <a class=\"pointer\" href=\"\" title=\"{{ \'ADF.WIDGET.TOOLTIP.PICTURE\' | translate}}\" ng-click=\"saveWidgetScreen(definition.wid)\"> <span class=\"glyphicon glyphicon-picture\"></span> {{ \'ADF.WIDGET.TOOLTIP.PICTURE\' | translate}} </a> </li> <li ng-if=\"widget.qr\"> <a class=\"pointer\" href=\"\" title=\"{{ \'ADF.WIDGET.TOOLTIP.QR\' | translate }}\" ng-click=\"generateQR()\"> <span class=\"fa fa-qrcode\" style=\"font-size: 1.1em;\"></span> {{ \'ADF.WIDGET.TOOLTIP.QR\' | translate }} </a> </li> <li ng-if=\"widget.csv\" permission permission-only=\" \'download\' \"> <a class=\"pointer\" href=\"\" title=\"{{ \'ADF.WIDGET.TOOLTIP.CSV\' | translate }}\" ng-click=\"downloadCsv()\"> <span class=\"glyphicon glyphicon-file\"></span> {{ \'ADF.WIDGET.TOOLTIP.CSV\' | translate }} </a> </li> <li permission permission-only=\" \'executeOperation\' \" ng-if=\"widget.executeOperation && isExecuteOperationEnabled()\"> <a class=\"pointer\" href=\"\" title=\"{{ \'ADF.WIDGET.TOOLTIP.OPERATION\' | translate }}\" ng-click=\"executeOperation()\"> <span class=\"glyphicon glyphicon-flash\"></span> {{ \'ADF.WIDGET.TOOLTIP.OPERATION\' | translate }} </a> </li> <li ng-if=\"widgetActionsHandler && widgetActionsHandler.actions && widgetActionsHandler.actions.length > 0\" ng-repeat=\"customAction in widgetActionsHandler.actions\" permission permission-only=\"customAction.permissions\"> <a class=\"pointer\" title=\"{{customAction.title}}\" ng-click=\"customAction.action(choice.value)\"> <span class=\"pointer {{customAction.icon}}\"></span> {{customAction.title}} </a> </li> </ul> </script> ");
$templateCache.put("../src/templates/widget-grid.html","<div adf-id={{definition.wid}} adf-widget-type={{definition.type}} ng-class=\"{\'widget-move-mode\': editMode}\" class=\"panel panel-default widget widget_{{definition.wid}}\"> <a name={{definition.wid}} id={{definition.wid}}></a> <div class=\"panel-heading clearfix\" ng-if=\"!widget.frameless || editMode\"> <div ng-include src=definition.titleTemplateUrl></div> </div> <div ng-class=\"{ \'panel-body\':!widget.frameless || editMode, \'widget-blur-loading\': (navOptionsHandler && navOptionsHandler.firstLoad && navOptionsHandler.loadingData) }\" uib-collapse=widgetState.isCollapsed> <div ng-if=\"!widgetState.isCollapsed && config.widgetSelectors && !editMode && filter.showFilter\" class=\"row form-group\" style=\"margin-top: 5px !important;\"> <div ng-if=\"filter.typeFilter === 0\" class=\"col-xs-12 col-md-8\"> <div class=filter mass-autocomplete> <input class=form-control style=padding-right:15px; name=filterValue ng-keydown=enter($event) ng-model=search.oql placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.ENTER.FILTER.ADVANCED\' | translate }}\" mass-autocomplete-item=autocomplete_options() ng-change=debugQuery()> <label ng-click=launchSearchingAdv() style=\"position: absolute;font-size: 1.5em;cursor:pointer;right: 15px;\" class=glyphicon ng-class=\"{ \'glyphicon-search\' : !filterApplied, \'glyphicon-ok\': filterApplied}\"></label> </div> <div ng-if=\"!editMode && filter_error\" class=col-xs-12> <alert type=danger class=\"text-center text-danger\"> <span>{{filter_error}}</span> </alert> </div> <div ng-if=\"filter.showFinalFilter && search.json\" class=col-xs-12> <pre>{{ search.json }}</pre> </div> </div> <div ng-if=\"filter.typeFilter === 1\" class=\"col-xs-12 col-md-8\"> <div class=filter> <input class=form-control style=padding-right:15px; name=filterValue ng-keydown=enter($event) ng-blur=launchSearchingQuick() ng-model=search.quick placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.ENTER.FILTER.BASIC\' | translate}}\"> <label ng-click=launchSearchingQuick() style=\"position: absolute;font-size: 1.5em;cursor:pointer;right: 15px;\" class=glyphicon ng-class=\"{ \'glyphicon-search\' : !filterApplied, \'glyphicon-ok\': filterApplied}\"></label> </div> </div> <div ng-if=\"filter.typeFilter === 2\" class=\"col-xs-12 col-md-8\"> <div class=filter> <ui-select id=sharedFilter ng-model=search.id theme=bootstrap title=\"{{ \'FORM.TITLE.SHARED_FILTER\' | translate }}\" on-select=\"filterSharedSelect($item, $model)\" on-remove=\"filterSharedRemove($item, $model)\"> <ui-select-match placeholder=\"{{ \'FORM.PLACEHOLDER.SHARED_FILTER\' | translate }}\" allow-clear=true>{{$select.selected.title}} </ui-select-match> <ui-select-choices repeat=\"sharedFilter in sharedFilters | filter: $select.search\"> <div> <span ng-bind-html=\"sharedFilter.title | highlight: $select.search\"> </span></div> <small> <div ng-if=\"sharedFilter.filter.type === \'advanced\'\">{{ \'FORM.LABEL.ADVANCED\' | translate }} <span ng-bind-html=\"\'\'+sharedFilter.filter.oql | highlight: $select.search\"></span> </div> <div ng-if=\"sharedFilter.filter.type === \'basic\'\">{{ \'FORM.LABEL.BASIC\' | translate }} <span ng-bind-html=\"\'\'+sharedFilter.filter.value | highlight: $select.search\"></span> </div> </small> </ui-select-choices> </ui-select>  </div> </div> <div class=\"col-xs-12 col-md-4\" uib-dropdown> <button class=\"btn btn-sm\" uib-dropdown-toggle title=\"{{\'ADF.WIDGET.TITLE.TOGGLE_AVANCED_BASIC_FILTER\' | translate }}\"> <i class=\"advanced-filter glyphicon\" ng-class=\"{\'glyphicon-font\' : filter.typeFilter === 0, \'glyphicon-bold\' : filter.typeFilter ===1, \'glyphicon-share\' : filter.typeFilter ===2,}\"></i> <span class=caret></span> </button> <ul class=\"dropdown-menu panel\" style=\"border: 1px groove;\" uib-dropdown-menu aria-labelledby=simple-dropdown> <li ng-click=\"filter.typeFilter = 0\"> <a href> <i class=\"advanced-filter glyphicon glyphicon-font txt-primary\"></i> {{\'ADF.WIDGET.TITLE.FILTER.ADVANCED\' | translate}}</a> </li> <li ng-click=\"filter.typeFilter = 1\"> <a href> <i class=\"basic-filter glyphicon glyphicon-bold txt-primary\"></i> {{\'ADF.WIDGET.TITLE.FILTER.BASIC\' | translate}}</a> </li> <li ng-click=\"filter.typeFilter = 2\"> <a href> <i class=\"basic-filter glyphicon glyphicon-share txt-primary\"></i> {{\'ADF.WIDGET.TITLE.FILTER.SHARED\' | translate}}</a> </li> </ul> </div> </div> <div ng-if=\"customSelectors && config.sort && filter.showFilter\" class=\"row form-group\" style=\"margin-top: 5px !important;\"> <div class=\"sort col-xs-12 col-md-8\"> <ui-select ng-model=config.sort.value theme=bootstrap title=\"{{\'ADF.WIDGET.TITLE.CHOOSE_ORDER\' | translate}}\" allow-clear=true append-to-body=true ng-change=launchSearching() ng-click=getCustomSelectors()> <ui-select-match placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.SHORTED_BY\' | translate}}\" allow-clear=true>{{ \'ADF.WIDGET.TITLE.SORTED_BY\' | translate:{item: $select.selected} }}</ui-select-match> <ui-select-choices repeat=\"selector in customSelectors | filter: $select.search track by $index\"> <small> <span ng-bind-html=\"selector | highlight: $select.search\"></span> </small> </ui-select-choices> </ui-select> </div> <div class=\"sortDirection col-xs-4 col-md-4\"> <button class=\"btn btn-sm pointer\" ng-click=changeDirection() ng-disabled=\"config.sort.value === \'\'\" title=\"{{\'ADF.WIDGET.TITLE.TOGGLE_SORTING_DIRECTION\' | translate}}\"> <i class=glyphicon style=font-size:1.3em; ng-class=\"config.sort.direction===\'ASCENDING\' ? \'glyphicon-sort-by-attributes\': \'glyphicon-sort-by-attributes-alt\'\"></i> </button> </div> </div> <adf-widget-content ng-if=definition model=definition content=widget extra=options.extraData nav-options-handler=navOptionsHandler filter-handler=filterHandler widget-actions-handler=widgetActionsHandler> </adf-widget-content></div> <div class=loaderContainer ng-if=\"navOptionsHandler && navOptionsHandler.firstLoad && navOptionsHandler.loadingData\"> <img class=loaderImage src={{widget.images[0]}}> </div> <div class=row ng-if=\"config.showSaveButton && sendEntities\"> <div class=col-xs-12> <button type=button class=\"btn btn-xs btn-primary pull-right oux-button-margin\" ng-click=sendEntities() translate>ADF.COMMON.SAVE</button> </div> </div> <div class=\"panel-footer row no-padding no-margin\"> <div class=\"col-xs-7 text-left\"> <span ng-if=\"navOptionsHandler && navOptionsHandler.statusMessage && !navOptionsHandler.loadingData && !navOptionsHandler.firstLoad\">{{navOptionsHandler.statusMessage | translate}}</span> </div> <div class=\"col-xs-5 spinner-container\" ng-if=\"navOptionsHandler && navOptionsHandler.loadingData && !navOptionsHandler.firstLoad\"> <div class=\"spinner pull-right\"></div> </div> <div class=\"col-xs-5 text-right no-padding no-margin\" ng-if=\"navOptionsHandler && navOptionsHandler.lastMessageTime && !navOptionsHandler.loadingData && !navOptionsHandler.firstLoad\"> <small class=label am-time-ago=navOptionsHandler.lastMessageTime></small> </div> </div> </div>");
$templateCache.put("../src/templates/widget-selection.html","<style>\n    .selected-entities-control .ui-select-container>div:first-child {\n        max-height: 300px;\n        overflow-y: scroll;\n        overflow-x: hidden;\n    }\n\n</style> <form name=widgetSelectionForm novalidate role=form ng-submit=saveChangesDialog()> <div class=modal-header> <div class=\"col-xs-12 col-md-12\"> <h3 class=\"modal-title text-left\"> <i class=\"fa fa-check-square-o\" aria-hidden=true></i> {{\'ADF.WIDGET.TITLE.SELECTED_ITEMS\' | translate}}</h3> </div> </div> <div class=modal-body> <div class=col-xs-12> <div class=\"form-group selected-entities-control\"> <label for=currentSelection translate>ADF.WIDGET.LABEL.CURRENT_SELECTION</label> <ui-select multiple tagging ng-model=currentSelection.selected theme=bootstrap sortable=false title=\"{{\'ADF.WIDGET.TITLE.SELECTED_ITEMS\' | translate}}\"> <ui-select-match placeholder=\"{{\'ADF.WIDGET.PLACEHOLDER.NO_SELECTED\' | translate}}\"> <div class=text-left style=\"margin-right: 15px;font-size: 0.9em;max-width:350px;\" ng-if=$item.value.visible> <span style=\"white-space: initial;word-break: break-word;\" ng-repeat=\"(k,v) in $item.value.visible track by $index\" ng-if=\"v !== undefined\"> <strong>{{k | translate}}:</strong> {{v}} <br> </span> </div> <div class=text-left style=\"margin-right: 15px;font-size: 0.9em;max-width:350px;\" ng-if=!$item.value.visible> <span style=\"white-space: initial;word-break: break-word;\">{{$item.key}}</span> </div> </ui-select-match> <ui-select-choices repeat=\"itemSel in currentSelection.selected | filter:$select.search\"> {{itemSel.key}} </ui-select-choices> </ui-select> </div> </div> <div class=\"col-xs-12 text-left\"> <button type=button class=\"btn btn-success btn-sm\" ng-click=restoreSelection() ng-disabled=\"currentSelection.selected.length === selectedItemsLength\" translate>ADF.WIDGET.BUTTON.RESTORE</button> <button type=button class=\"btn btn-danger btn-sm\" ng-click=clearSelection() ng-disabled=\"currentSelection.selected.length < 1\" translate>ADF.WIDGET.BUTTON.CLEAR</button> </div> </div> <div class=modal-footer> <div permission permission-only=\"\'viewFilter\'\" class=\"col-xs-12 col-md-2 text-left\"> <div uib-dropdown ng-if=\"selectionConfig && selectionConfig.filterTypes && currentSelection.selected.length > 0\"> <button id=applyFilterBy type=button class=\"btn btn-primary\" uib-dropdown-toggle> <i class=\"glyphicon glyphicon-filter pointer\"></i> {{\'ADF.WIDGET.BUTTON.FILTER_BY\' | translate}} <span class=caret></span> </button> <ul class=dropdown-menu uib-dropdown-menu role=menu aria-labelledby=applyFilterBy> <li role=menuitem ng-repeat=\"filterType in selectionConfig.filterTypes\"> <a href ng-click=applyFilter(filterType) title=\"{{\'ADF.WIDGET.BUTTON.SELECTED\' | translate:{filterType: filterType} }}\">{{\'ADF.WIDGET.BUTTON.SELECTED\' | translate:{filterType: filterType} }}</a> </li> </ul> </div> </div> <div permission permission-only=\"\'executeOperation\'\" class=\"col-xs-12 col-md-3 text-left\"> <div uib-dropdown ng-if=\"selectionConfig && selectionConfig.operationTypes && currentSelection.selected.length > 0\"> <button id=executeOperation type=button class=\"btn btn-primary\" uib-dropdown-toggle> <i class=\"glyphicon glyphicon-flash pointer\"></i> {{\'ADF.WIDGET.BUTTON.EXECUTE_OPERATION\' | translate}} <span class=caret></span> </button> <ul class=dropdown-menu uib-dropdown-menu role=menu aria-labelledby=executeOperation> <li role=menuitem ng-repeat=\"operationType in selectionConfig.operationTypes\"> <a href ng-click=executeOperation(operationType) title={{operationType|translate}}>{{operationType|translate}}</a> </li> </ul> </div> </div> <div class=\"col-xs-12 col-md-7 text-right\"> <button type=submit class=\"btn btn-primary\" ng-disabled=\"currentSelection.selected.length === selectedItemsLength\" translate value=\"{{\'ADF.WIDGET.BUTTON.APPLY\' | translate }}\">ADF.WIDGET.BUTTON.APPLY</button> <button type=button class=\"btn btn-default\" ng-click=closeDialog() translate>ADF.COMMON.CLOSE</button> </div> </div> </form> ");}]);
})(window);