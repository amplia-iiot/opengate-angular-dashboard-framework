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
    .directive('adfDashboard', function($rootScope, $log, $timeout, $uibModal, dashboard, adfTemplatePath, $translate, Upload) {
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
            controller: function($scope) {
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