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
    .value('adfVersion', '8.10.1');
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
    .directive('adfDashboard', ["$rootScope", "$log", "$timeout", "$uibModal", "dashboard", "adfTemplatePath", "$translate", "Upload", function($rootScope, $log, $timeout, $uibModal, dashboard, adfTemplatePath, $translate, Upload) {
        

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
            var config = dashboard.widgets[type].config || {};
            cfg = angular.copy(config);
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

                var allWidgetCategoriesTranslated = [];
                angular.forEach(categoriesTmp, function(category, idx) {
                    // push widget to category array
                    var translatedCat = $translate.instant(category);
                    if (categories.indexOf(translatedCat) === -1) {
                        categories.push(translatedCat);
                    }

                    if (allWidgetCategoriesTranslated.indexOf(translatedCat) === -1) {
                        allWidgetCategoriesTranslated.push(translatedCat);
                    }
                });
                widget.categoryTags = allWidgetCategoriesTranslated.toString();

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
                var model = {
                    extraConfig: {
                        cellHeight: 145
                    }
                };
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
                        var config = definition.config || {};
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
                    return reloadWidgets;
                };

                var updateWidgetFilters = function(model) {
                    var widgetFilters = [];
                    var grid = model.grid;
                    if (grid && grid.length > 0) {
                        grid.forEach(function(element) {
                            var definition = element.definition;
                            var config = definition.config || {};
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

                            if (!model.extraConfig) {
                                model.extraConfig = {
                                    cellHeight: 145
                                };
                            } else {
                                if (!model.extraConfig.cellHeight) {
                                    model.extraConfig.cellHeight = 145;
                                }
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
                var adfWidgetRemovedAndSave = $scope.$on('adfWidgetRemovedFromGridAndSave', function(event, widget) {
                    var index = null;
                    $scope.toggleEditMode();
                    angular.forEach($scope.adfModel.grid, function(widgetTmp, idx) {
                        if (widgetTmp.definition.wid === widget.wid) {
                            index = idx;
                        }
                    });

                    if (index >= 0) {
                        $scope.adfModel.grid.splice(index, 1);
                    }
                    $scope.toggleEditMode();
                });

                $scope.cancelEditMode = function() {
                    $scope.editMode = false;
                    if (!$scope.continuousEditMode && ($scope.modelCopy !== $scope.adfModel)) {
                        $scope.modelCopy = angular.copy($scope.modelCopy, $scope.adfModel);
                    }
                    $rootScope.$broadcast('adfDashboardEditsCancelled', $scope.adfModel.title, $scope.adfModel);
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
                        extraConfig: angular.copy(model.extraConfig)
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
                                    editDashboardScope.iconConfiguration.iconType = 'image';

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


                    editDashboardScope.closeDialog = function(cancelChanges) {
                        if (!cancelChanges) {
                            // copy the new title back to the model
                            model.title = editDashboardScope.copy.title;
                            model.description = editDashboardScope.copy.description;
                            if (editDashboardScope.iconConfiguration.model === 'image') {
                                model.icon = editDashboardScope.iconConfiguration.url;

                            } else if (editDashboardScope.iconConfiguration.model === 'icon') {
                                model.icon = (editDashboardScope.iconConfiguration.icon && editDashboardScope.iconConfiguration.icon.key) || editDashboardScope.iconConfiguration.icon;

                            }
                            model.iconType = editDashboardScope.iconConfiguration.model;
                            model.backgroundColor = editDashboardScope.copy.backgroundColor ? editDashboardScope.copy.backgroundColor : undefined;
                            model.backgroundImage = editDashboardScope.copy.backgroundImage ? editDashboardScope.copy.backgroundImage : undefined;
                            model.backgroundImageSize = editDashboardScope.backgroundSize.model;
                            model.extraConfig = editDashboardScope.copy.extraConfig ? editDashboardScope.copy.extraConfig : undefined;

                            $rootScope.$broadcast('adfDashboardInternalConfigChanged', model);
                        } else {
                            console.warn('Dashboard config cancelled by user');
                        }

                        // close modal and destroy the scope
                        instance.close();
                        editDashboardScope.$destroy();
                    };
                };

                var adfOpenWidgetFromOther = $scope.$on('adfOpenWidgetFromOther', function(event, widget, config) {
                    var internal_config = createConfiguration(widget);
                    var _config = angular.merge({}, internal_config, config || {});
                    var w = {
                        type: widget,
                        config: _config,
                        title: _config.title
                    };
                    addNewWidgetToModel(model, w, name, !$scope.editMode);
                });

                var adfOpenModalWidgetFromOther = $scope.$on('adfOpenModalWidgetFromOther', function(event, widgetType, config, origScope) {
                    var templateUrl = adfTemplatePath + 'widget-fullscreen.html';
                    var _config = config || {};
                    if (_config.sendSelection) {
                        templateUrl = adfTemplatePath + 'widget-fullscreen-selection.html';
                    }

                    var fullScreenScope;
                    if (!origScope) {
                        var widget = createWidget(widgetType);
                        widget.config = angular.merge({}, widget.config, _config);
                        widget.type = widgetType;
                        if (widget.config.title) {
                            widget.title = widget.config.title;
                        }

                        fullScreenScope = $scope.$new();
                        fullScreenScope.definition = fullScreenScope.widget = widget;
                    } else {
                        fullScreenScope = origScope;
                    }

                    var opts = {
                        scope: fullScreenScope,
                        templateUrl: templateUrl,
                        size: fullScreenScope.definition.modalSize || 'el',
                        backdrop: 'static',
                        windowClass: (fullScreenScope.definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    };

                    if ($scope.model && !$scope.model.temporal) {
                        fullScreenScope.persistDashboard = function() {
                            $rootScope.$broadcast('adfOpenWidgetFromOther', this.$parent.widget.type, this.$parent.widget.config || {});
                            this.closeDialog();
                        };
                    }

                    var instance = $uibModal.open(opts);
                    fullScreenScope.closeDialog = function() {
                        instance.close();
                        if (!origScope) {
                            fullScreenScope.$destroy();
                        } else {
                            fullScreenScope.reload();
                        }
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
                            widget.category = 'ADF.CATEGORY.MISCELLANEOUS';
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
                    adfWidgetRemovedAndSave();
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
        

        var gridOptions = {
            cellHeight: 145,
            verticalMargin: 10,
            animate: true,
            float: false,
            alwaysShowResizeHandle: true,
            minWidth: 768,
            auto: true,
            resizable: {
                handles: 'e, se, s, sw, w'
            },
            disableDrag: true,
            disableResize: true
        };

        function preLink($scope) {
            gridOptions.disableDrag = !$scope.editMode;
            gridOptions.disableResize = !$scope.editMode;
            $scope.gridOptions = gridOptions;

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

                dashEvents.push($scope.$on('adfDashboardEditsCancelled', function($event, name, model) {
                    if (model && model.extraConfig) {
                        if (angular.isNumber(model.extraConfig.cellHeight)) {
                            $scope.gsHandler.cellHeight(model.extraConfig.cellHeight);
                        }
                    }

                    $timeout(function() {
                        $scope.gsHandler.disable();
                    }, 100);
                }));

                dashEvents.push($scope.$on('adfDashboardInternalConfigChanged', function($event, newModel) {
                    if (newModel && newModel.extraConfig) {
                        if (angular.isNumber(newModel.extraConfig.cellHeight)) {
                            $scope.gsHandler.cellHeight(newModel.extraConfig.cellHeight);
                        }
                    }
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

                // $scope.onDragStart = function(event, ui) {
                //     console.log('onDragStart event: ' + event + ' ui:' + ui);
                // };

                $scope.onDragStop = function(event, ui) {
                    console.log('onDragStop event: ' + event + ' ui:' + ui);
                    $scope.adfModel.grid = GridStackUI.Utils.sort($scope.adfModel.grid);
                };

                // $scope.onResizeStart = function(event, ui) {
                //     console.log('onResizeStart event: ' + event + ' ui:' + ui);
                // };

                $scope.onResizeStop = function(event, ui) {
                    console.log('onResizeStop event: ' + event + ' ui:' + ui);
                    $scope.adfModel.grid = GridStackUI.Utils.sort($scope.adfModel.grid);
                    $scope.$broadcast('OnResizeWidget');
                };

                // $scope.onItemAdded = function(item) {
                //     console.log('onItemAdded item: ' + item);
                // };

                // $scope.onItemRemoved = function(item) {
                //     console.log('onItemRemoved item: ' + item);
                // };

                if ($scope.adfModel && $scope.adfModel.extraConfig) {
                    if (angular.isNumber($scope.adfModel.extraConfig.cellHeight)) {
                        gridOptions.cellHeight = $scope.adfModel.extraConfig.cellHeight;
                    }
                }

                $scope.$on('$destroy', function() {
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
    .provider('dashboard', function () {

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
        var defaultApplyFunction = function () {
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
        this.widget = function (name, widget) {
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
            //OUW-1610
            if (!w.config) {
                w.config = {};
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
        this.widgetsPath = function (path) {
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
        this.messageTemplate = function (template) {
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
        this.loadingTemplate = function (template) {
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
        this.customWidgetTemplatePath = function (templatePath) {
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
        this.$get = function () {
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
                id: function () {
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
                idEquals: function (id, other) {
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
    .directive('adfWidgetContent', ["$log", "$q", "widgetService", "$compile", "$controller", "$injector", "dashboard", "$translate", function($log, $q, widgetService,
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
    .factory('widgetFilter', function() {
        

        var launchSearchingAdv = function($scope) {
            //modificas
            //$scope.filter.typeFilter = 0;


            var advancedFilterScope = $scope.$new();
            var advancedFilterTemplate = adfTemplatePath + 'widget-advanced-filter.html';
            var opts = {
                scope: advancedFilterScope,
                templateUrl: advancedFilterTemplate,
                backdrop: 'static',
                size: 'lg',
                animation: true
            };
        }


        return {
            launchSearchingAdv: launchSearchingAdv
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
    .directive('adfWidgetGrid', ["$injector", "$q", "$log", "$uibModal", "$rootScope", "$interval", "dashboard", "adfTemplatePath", "Filter", "queryService", "$timeout", "$api", "toastr", "$translate", function($injector, $q, $log, $uibModal, $rootScope, $interval, dashboard, adfTemplatePath, Filter, queryService, $timeout, $api, toastr, $translate) {
        var _setFilterType = function(selectFilter, $scope) {
            var config = $scope.config || {};
            var filter = config.filter = config.filter ? config.filter : {};
            var id = filter.id = selectFilter && filter.id;
            filter.headersFilter = selectFilter && filter.headersFilter;

            if (!$scope.filter) {
                $scope.filter = {};
            }
            switch (filter.type) {
                case 'advanced':
                    $scope.filter.typeFilter = id ? 2 : 0;
                    $scope.search = {
                        oql: filter.oql,
                        json: filter.value,
                        queryAsString: filter.queryAsString || '',
                        queryFields: filter.queryFields || undefined
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
                    // pass config to scope
                    $scope.config = config;

                    if (typeof $scope.widget.show_modal_footer === 'undefined') {
                        $scope.widget.show_modal_footer = true;
                    }

                    if (typeof $scope.widget.show_reload_config === 'undefined') {
                        $scope.widget.show_reload_config = true;
                    }

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
            var config = $scope.config || {};

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

                if (filter) {
                    if (filter.headersFilter && filter.headersFilter.length > 0) {
                        return true;
                    } else {
                        if (filter.type === 'basic') {
                            return filter.value && filter.value.length > 0;
                        }
                        if (filter.type === 'advanced') {
                            return filter.value && filter.value.length > 2 && filter.oql;
                        }
                    }
                }

                return false;
            };

            $scope.executeOperation = function() {
                if (!$scope.editMode) {

                    $scope.$parent.$broadcast('widgetExecuteOperation');
                }
            };

            _setFilterType('init', $scope);

            $scope.launchSearching = function() {
                if ($scope.widget && !$scope.widget.preventRefreshFilterEvent) {
                    var widget = {
                        definition: definition,
                        element: $element
                    };

                    $rootScope.$broadcast('adfLaunchSearchingFromWidget', widget, $scope.config.filter);
                }

                $scope.reload();
            };

            $scope.buildAndLaunchSearchingAdv  = function() {
                $scope.config.filter = {
                    type: 'advanced',
                    oql: $scope.search.oql ? $scope.search.oql : '',
                    queryAsString: $scope.search.queryAsString,
                    value: $scope.search.json || '',
                    queryFields: $scope.search.queryFields
                };    
                $scope.launchSearching();
                $scope.filterApplied = true;
        }

            $scope.launchSearchingAdv = function() {
                $scope.filter.typeFilter = 0;

                var advancedFilterScope = $scope.$new();
                var advancedFilterTemplate = adfTemplatePath + 'widget-advanced-filter.html';
                var opts = {
                    scope: advancedFilterScope,
                    templateUrl: advancedFilterTemplate,
                    backdrop: 'static',
                    size: 'lg',
                    animation: true
                };
                advancedFilterScope.fieldsSearch = { selected: [] };
                advancedFilterScope.datastreamsSearch = { selected: [] };

                // advancedFilterScope.model = {};
                advancedFilterScope.enableApply = false;
                advancedFilterScope.evaluating = false;

                advancedFilterScope.type = $scope.definition.Ftype
                if ($scope.search.queryFields) {
                    $scope.search.queryFields.forEach(function(item) {
                        advancedFilterScope.fieldsSearch.selected.push(item.name);
                        advancedFilterScope.datastreamsSearch.selected.push({ identifier: item.name });

                    });
                }
                advancedFilterScope.addextraElements = function(field) {
                    if (field.name === 'provision.device.location' || field.name === 'provision.device.communicationModules[].subscription.address') {
                        field.existsOptions = ['true', 'false']
                        field.disabledComparators = []
                    } else {
                        field.disabledComparators = [
                            8
                        ];
                    }
                   field.existsOptions = ['true', 'false'];
                   if ($scope.definition.Ftype === 'entities' || $scope.definition.Ftype === 'tickets'){
                    field.dsOptions = ['', '._current.value',
                        '._current.source',
                        '._current.at',
                        '._current.date',
                        '._current.provType',
                        '.scoring.performance',
                        '.scoring.qrating.version',
                        '.scoring.qrating.max_score',
                        '.scoring.qrating.ideal.value',
                        '.scoring.qrating.ideal.label',
                        '.scoring.qrating.max_desired.value',
                        '.scoring.qrating.max_desired.label',
                        '.scoring.qrating.max_allowed.value',
                        '.scoring.qrating.max_allowed.label',
                        '.scoring.qrating.min_desired.value',
                        '.scoring.qrating.min_desired.label',
                        '.scoring.qrating.min_required.value',
                        '.scoring.qrating.min_required.label',
                    ];
                }
                    field.schemaForm = {
                        type: "object",
                        properties: {
                            data: field.schema
                        }
                    };
                    field.form = [{
                        key: 'data',
                        notitle: true,
                        fieldHtmlClass:field.schemaName
                    }];
                    return field;
                }
                advancedFilterScope.removeextraElements = function(field) {
                    delete field.existsOptions;
                    delete field.dsOptions;
                    delete field.form;
                    delete field.schemaForm;
                    delete field.model;
                    return field;
                }


                advancedFilterScope.fields = $scope.search.queryFields ? $scope.search.queryFields.map(function(field) { return advancedFilterScope.addextraElements(field) }) : [];

                if ($scope.definition.Ftype === 'entities' || $scope.definition.Ftype === 'tickets') {
                    advancedFilterScope.comparators = [
                        { id: 1, name: 'eq', value: '=', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 2, name: 'neq', value: '!=', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 3, name: 'like', value: '~', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 4, name: 'gt', value: '>', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 5, name: 'gte', value: '>=', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 6, name: 'lt', value: '<', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 7, name: 'lte', value: '<=', dataTemplate: '../src/templates/input-template.html', defaultData: [] },
                        { id: 8, name: 'exists', value: '?', dataTemplate: '../src/templates/exist-template.html', defaultData: [] },
                        { id: 9, name: 'in', value: '[]', dataTemplate: '../src/templates/in-template-entities.html', defaultData: [], dataType: 'array' },
                    ];
                    $api().basicTypesSearchBuilder().execute().then(function(response) {
                        if (response.statusCode === 200) {
                            advancedFilterScope.jsonSchemas = response.data.definitions;
                        } else {
                            advancedFilterScope.jsonSchemas = {};
                        }
                    }).catch(function(err) {
                        advancedFilterScope.jsonSchemas = {};
                        console.error(err);
                    });
                } else {
                    advancedFilterScope.comparators = [
                        { id: 1, name: 'eq', value: '=' },
                        { id: 2, name: 'neq', value: '!=' },
                        { id: 3, name: 'like', value: '~' },
                        { id: 4, name: 'gt', value: '>' },
                        { id: 5, name: 'gte', value: '>=' },
                        { id: 6, name: 'lt', value: '<' },
                        { id: 7, name: 'lte', value: '<=' },
                        { id: 8, name: 'in', value: '[]', dataTemplate: '../src/templates/filter/in-template.html', defaultData: [], dataType: 'array' },
                    ];
                }

                advancedFilterScope.elementSelected = function($item) {
                    advancedFilterScope.fields.push(advancedFilterScope.addextraElements({
                        id: Math.floor((Math.random() * 10000) + 1),
                        name: $item
                    }));
                };
                function findAvailableFields(type, parent) {
                    var fieldsFound = [];
            
                    if (type.properties) {
                        angular.forEach(type.properties, function(fieldType, field) {
                            fieldsFound.push((parent ? parent + '.' : '') + field);
            
                            if (fieldType.properties) {
                                fieldsFound = fieldsFound.concat(findAvailableFields(fieldType, (parent ? parent + '.' : '') + field));
                            } else if (fieldType.items && fieldType.items.properties) {
                                fieldsFound = fieldsFound.concat(findAvailableFields(fieldType.items, (parent ? parent + '.' : '') + field));
                            }
                        });
                    } else if (type.items && type.items.properties) {
                        fieldsFound = fieldsFound.concat(findAvailableFields(type.items, parent));
                    }
            
                    return fieldsFound;
                }

                advancedFilterScope.onSelectDatastream = function($item) {
                    var schemaName = ($item.schema && $item.schema.$ref) ? $item.schema.$ref.split('/').splice(-1)[0] : undefined;
                    var schema = schemaName ? advancedFilterScope.jsonSchemas[schemaName] : ($item.schema ? $item.schema : undefined);
                    delete schema.javaEnumNames;
                    var availableFields ;
                    var objectSchema = {
                        type: "object",
                        properties: {
                            data: schema
                        }
                    };   
                    if(schema.type === 'object'){
                        availableFields = findAvailableFields(schema);
                    }
                    $timeout(function() {                 
                        advancedFilterScope.fields.push(advancedFilterScope.addextraElements({
                            id: Math.floor((Math.random() * 10000) + 1),
                            name: $item.identifier,
                            type: schema.type,
                            schemaForm: objectSchema,
                            schema: schema,
                            availableFields: availableFields,
                            form: [{
                                key: 'data',
                                notitle: true
                            }],
                            schemaName: schemaName
                        }));
                    },100);
                };

                advancedFilterScope.onDeleteDatastream = function($item) {
                    advancedFilterScope.fields = advancedFilterScope.fields.filter(function(item) {
                        return item.name !== $item.identifier
                    });
                };

                advancedFilterScope.elementDeleted = function($item) {
                    advancedFilterScope.fields = advancedFilterScope.fields.filter(function(item) {
                        return item.name !== $item
                    });
                };

                advancedFilterScope.clearFieldsSearch = function() {
                    advancedFilterScope.advancedFilter_error = null
                    advancedFilterScope.fields = [];
                    advancedFilterScope.fieldsSearch = { selected: [] };
                    advancedFilterScope.datastreamsSearch = { selected: [] };

                };

                advancedFilterScope.restoreSelection = function() {
                    selectionScope.currentSelection = {
                        selected: selectionScope.selectedItems
                    };
                };

                advancedFilterScope.operators = [
                    { name: 'and', value: '&&' },
                    { name: 'or', value: '||' }

                ];
                advancedFilterScope.queryBuilderfilter = {
                    group: { operator: advancedFilterScope.operators[0], rules: [] }

                };
                advancedFilterScope.settings = {
                    nesting: true,
                    addIconClass: ' glyphicon glyphicon-plus',
                    removeIconClass: 'glyphicon glyphicon-trash',
                    addButtonClass: 'btn btn-sm btn-primary',
                    removeButtonClass: 'btn btn-sm btn-danger'
                };
                advancedFilterScope.queryAsString = $scope.search.queryAsString ? $scope.search.queryAsString : '';

                advancedFilterScope.filterJson = {};
                advancedFilterScope.advancedFilter_error = null;

                advancedFilterScope.evaluateQuery = function() {
                    try {
                        advancedFilterScope.evaluating = true;       
                        advancedFilterScope.oql = queryService.asReadableFilter(advancedFilterScope.queryBuilderfilter.group);
                        advancedFilterScope.queryAsString = queryService.asStringFilter(advancedFilterScope.queryBuilderfilter.group);
                        Filter.parseQuery(advancedFilterScope.oql || '')
                            .then(function(data) {
                                $timeout(function() {
                                    advancedFilterScope.enableApply = true;
                                    advancedFilterScope.evaluating = false;       
                               });
                                advancedFilterScope.filterJson = angular.toJson(data.filter, null, 4); // stringify with 4 spaces at each level;
                                advancedFilterScope.unknownWords = '';
                                advancedFilterScope.advancedFilter_error = null;

                            })
                            .catch(function(err) {
                                console.log(err);
                                advancedFilterScope.advancedFilter_error = err;
                                $timeout(function() {
                                    advancedFilterScope.enableApply = false;
                                    advancedFilterScope.evaluating = false;    
                               });
                                toastr.error($translate.instant('TOASTR.FILTER_IS_MALFORMED'));
                            });
                    } catch (err) {
                        advancedFilterScope.advancedFilter_error = err;
                        advancedFilterScope.enableApply = false;
                        toastr.error($translate.instant('TOASTR.FILTER_IS_MALFORMED'));

                    }
                }

                advancedFilterScope.applyQueryBuilderFilter = function() {
                    var fields = angular.copy(advancedFilterScope.fields);
                    $scope.config.filter = {
                        type: 'advanced',
                        oql: advancedFilterScope.oql ? advancedFilterScope.oql : '',
                        queryAsString: advancedFilterScope.queryAsString,
                        value: advancedFilterScope.filterJson || '',
                        headersFilter: $scope.config.filter.headersFilter || undefined,
                        queryFields: fields.length > 0 ? fields.map(function(field) {
                            return advancedFilterScope.removeextraElements(field);
                        }) : fields
                    };
                    var executeSearch = true;
                    if (executeSearch) {
                        $scope.launchSearching();
                        $scope.filterApplied = true;
                        advancedFilterScope.closeDialog();
                    }
                    else {
                        advancedFilterScope.closeDialog();
                    }

                }
                advancedFilterScope.$watch('queryBuilderfilter', function(newValue) {
                    advancedFilterScope.enableApply = false;

                }, true);

                $scope.$on('clearFilter', function(index) {
                    advancedFilterScope.enableApply = true;
                });
                advancedFilterScope.clearQuery = function() {
                    delete advancedFilterScope.oql;
                    delete advancedFilterScope.queryAsString;
                    delete advancedFilterScope.json;

                    advancedFilterScope.filterJson = undefined;
                    advancedFilterScope.queryBuilderfilter = {
                        group: { operator: advancedFilterScope.operators[0], rules: [] }
                    };
                    advancedFilterScope.clearFieldsSearch();
                    $timeout(function() {
                        advancedFilterScope.enableApply = true;
                   });

                }
                var instance = $uibModal.open(opts);
                // Cierra sin realizar ninguna acción
                advancedFilterScope.closeDialog = function() {
                    instance.close();
                    advancedFilterScope.$destroy();
                };

                /*if (!$scope.filterApplied) {
                    var executeSearch = true;
                    $scope.search.quick = '';
                    if ($scope.search.json === '' || $scope.search.json === '{}' || (!angular.isString($scope.search.json) && Object.keys($scope.search.json).length === 0)) {
                        if ($scope.search.oql && $scope.search.oql.trim().length > 0) {
                            toastr.error($translate.instant('TOASTR.FILTER_IS_MALFORMED'));
                            executeSearch = false;
                        } else {
                            $scope.config.filter = {
                                type: 'advanced',
                                oql: '',
                                value: ''
                            };
                        }
                    } else {
                        $scope.config.filter = {
                            type: 'advanced',
                            oql: $scope.search.oql,
                            value: $scope.search.json,
                            headersFilter: $scope.config.filter.headersFilter
                        };
                    }

                    if (executeSearch) {
                        $scope.launchSearching();
                        $scope.filterApplied = true;
                    }
                }*/
            };

            $scope.launchSearchingQuick = function() {
                if (!$scope.filterApplied) {
                    if (!$scope.search) {
                        $scope.search = {};
                    }
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
                var shared = $scope.search.id;
                if (shared) {
                    shared.filter.id = shared.wid;
                    $scope.config.filter = shared.filter;
                } else {
                    $scope.config.filter = {};
                }
                $scope.launchSearching();
                $scope.filterApplied = true;
            };

            $scope.filterSharedSelect = function($item, $model) {
                $scope.filterApplied = false;
                $scope.launchSearchingShared();
            };
            $scope.filterSharedRemove = function($item, $model) {
                $scope.filterApplied = false;
            };

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
                    var customFilter = selectionScope.selectionConfig.filterAction(selectionScope.currentSelection.selected, type);

                    if (!angular.isUndefined(customFilter) && customFilter.oql !== null) {
                        $scope.filter.typeFilter = 0;
                        Filter.parseQuery(customFilter.oql).then(function(data) {
                            $scope.search.oql = customFilter.oql;
                            $scope.search.queryAsString = customFilter.qas;
                            $scope.search.queryFields = customFilter.qf;
                            $scope.search.json = angular.toJson(data.filter, null, 4); // stringify with 4 spaces at each level;
                            $scope.unknownWords = '';
                            $scope.filter_error = null;

                            $scope.buildAndLaunchSearchingAdv();
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
            $scope.edit = function(deleteIfNotConfigured) {
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

                editScope.closeDialog = function(value) {
                    instance.close();
                    if (deleteIfNotConfigured && value === 'close') {
                        $rootScope.$broadcast('adfWidgetRemovedFromGrid', editScope.definition);
                    }

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

                    var editScopeDefinition = editScope.definition.config || {};
                    // injection locals
                    var locals = {
                        widget: widget,
                        definition: editScope.definition,
                        config: editScopeDefinition
                    };

                    // invoke apply function and apply if success
                    var result = $injector.invoke(applyFn, applyFn, locals);
                    createApplyPromise(result).then(function() {
                        definition.title = editScope.definition.title;
                        if (editScope.definition.type === 'summaryChart') {
                            if (editScope.definition.config.type === 'ENTITIES_VALUES') {
                                editScope.definition.Ftype = 'entities';
                                definition.Ftype = 'entities';
                            } else {
                                editScope.definition.Ftype = editScope.definition.config.type.toLowerCase();
                                definition.Ftype = editScope.definition.config.type.toLowerCase();
                            }
                        }
                        angular.extend(definition.config, editScopeDefinition);

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
            controller: ["$scope", "$element", function($scope, $element) {
                $scope.filter = {
                    typeFilter: 1,
                    showFilter: false,
                    showFinalFilter: false
                };

                var windowTimeChanged = $scope.$on('onWindowTimeChanged', function(event, timeObj) {
                    $scope.config.windowFilter = timeObj ? timeObj : (config.windowFilter ? {} : timeObj);
                    var widget = {
                        definition: definition,
                        element: $element
                    };
                    $rootScope.$broadcast('adfWindowTimeChangedFromWidget', widget, $scope.config.windowFilter);
                    $scope.$broadcast('widgetWindowTimeChanged', $scope.config.windowFilter);
                    $scope.reload();
                });

                this.updateWidgetFilters = function(filterId, configChange) {
                    if ($scope.options && $scope.options.extraData && $scope.options.extraData.widgetFilters) {
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
                            _setFilterType(selectFilter, $scope);
                    }

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
                        $scope.edit(true);
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
                        var widgetFilters = $scope.options && $scope.options.extraData && $scope.options.extraData.widgetFilters;
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
                    var elem = document.getElementsByClassName('widget widget_' + $scope.definition.wid);
                    if (elem[0].requestFullscreen) {
                        elem[0].requestFullscreen();
                        $scope.$broadcast('OnResizeWidget');
                    } else if (elem[0].mozRequestFullScreen) { /* Firefox */
                        elem[0].mozRequestFullScreen();
                        $scope.$broadcast('OnResizeWidget');
                    } else if (elem[0].webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                        elem[0].webkitRequestFullscreen();
                        $scope.$broadcast('OnResizeWidget');
                    } else if (elem[0].msRequestFullscreen) { /* IE/Edge */
                        elem[0].msRequestFullscreen();
                        $scope.$broadcast('OnResizeWidget');
                    } else {
                        $scope.$emit('adfOpenModalWidgetFromOther', definition.type, $scope.config || {}, $scope);
                    }
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


                $scope.moveWidgetToDashboard = function(wId) {
                    $scope.$emit('ouxWidget-move', {
                        'objectSelector': '.widget_' + wId
                    }, wId);
                };
                $scope.copyWidgetToDashboard = function(wId) {
                    $scope.$emit('ouxWidget-copy', {
                        'objectSelector': '.widget_' + wId
                    }, wId);
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
                    if ($scope.config.getWindowTime && $scope.config.onWindowTimeChanged) {
                        var winTime = $scope.config.getWindowTime();
                        var window_filter = $scope.config.onWindowTimeChanged(winTime);
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
                    var config = $scope.config || $scope.definition.config || {};


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
                    windowTimeChanged();
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

})(window);