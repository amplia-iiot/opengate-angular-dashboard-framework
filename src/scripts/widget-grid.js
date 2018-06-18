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
    .directive('adfWidgetGrid', function($injector, $q, $log, $uibModal, $rootScope, $interval, dashboard, adfTemplatePath, Filter) {
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

                    if (typeof $scope.widget.show_modal_footer === "undefined") {
                        $scope.widget.show_modal_footer = true;
                    }

                    if (typeof $scope.widget.show_reload_config === "undefined") {
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
            }

            $scope.isExecuteOperationEnabled = function() {

                if (config.entityKey)
                    return true;
                var filter = config.filter;
                if (typeof filter === "string") {
                    return filter.length > 0;
                }
                if (typeof filter === "object") {
                    return filter.value.length > 2 && filter.oql;
                }
                return false;
            }

            $scope.executeOperation = function() {
                if (!$scope.editMode) {

                    $scope.$parent.$broadcast('widgetExecuteOperation');
                }
            };

            $scope.filter = {
                value: ""
            };
            $scope.sort = {
                value: "",
                direction: ""
            };

            $scope.toggleAdvanced = 1;
            var filter = config.filter;
            if (typeof filter === "object" && filter.oql && filter.oql.length > 2) {
                $scope.search = {
                    oql: filter.oql,
                    json: filter.value
                };
                $scope.toggleAdvanced = 0;
            } else if (typeof filter === "string") {
                $scope.search = {
                    quick: filter
                };
                $scope.toggleAdvanced = 1;
            } else if (typeof filter === "object" && filter.fields) {
                $scope.search = {
                    customFilter: filter.fields
                };
                $scope.search.fields = [];
                angular.forEach(filter.fields, function(v, key) {
                    $scope.search.fields.push(v.name);
                });
                $scope.toggleAdvanced = 2;
            } else {
                $scope.search = {
                    quick: filter = ""
                };
            }

            $scope.toggleFilter = function(advanced) {
                $scope.toggleAdvanced = advanced;
            };
            $scope.filterAvailable = false;
            $scope.showFilter = function() {
                $scope.filterAvailable = $scope.filterAvailable === true ? false : true;
            };

            $scope.showFinalFilter = false;

            $scope.launchSearching = function() {
                var widget = {
                    definition: definition,
                    element: $element
                };

                $rootScope.$broadcast('adfLaunchSearchingFromWidget', widget, $scope.config.filter);
                $scope.reload(true);
            }
            $scope.addCustomFilter = function(key) {
                $scope.search.customFilter = $scope.search.customFilter ? $scope.search.customFilter : [];
                $scope.search.customFilter.push({
                    name: key,
                    value: ''
                });
            }

            $scope.launchCustomFilter = function() {
                if ($scope.search.customFilter && $scope.search.customFilter.length > 0) {
                    $scope.search.oql = $scope.search.json = '';

                    $scope.config.filter = {
                        value: {
                            and: []
                        },
                        fields: $scope.search.customFilter
                    }
                    angular.forEach($scope.search.customFilter, function(v, key) {
                        if (v.value) {
                            var like = {};
                            like[v.name] = v.value;
                            $scope.config.filter.value.and.push({
                                'like': like
                            });
                        }

                    });
                    $scope.config.filter.value = JSON.stringify($scope.config.filter.value);
                }

                $scope.launchSearching();
            }



            $scope.deleteFilter = function(value, model) {
                angular.forEach($scope.search.customFilter, function(v, key) {
                    if (v.name === value) {
                        $scope.search.customFilter.splice(key, 1);
                    }
                });
                if ($scope.search.customFilter.length === 0) {
                    $scope.config.filter = {};
                }
            };

            $scope.launchSearchingAdv = function() {
                if (!$scope.filterApplied) {
                    $scope.search.quick = '';
                    if ($scope.search.json === '' || $scope.search.json === '{}' || (!angular.isString($scope.search.json) && Object.keys($scope.search.json).length === 0)) {
                        $scope.config.filter = {
                            oql: '',
                            value: ''
                        };
                    } else {
                        $scope.config.filter = {
                            oql: $scope.search.oql,
                            value: $scope.search.json
                        };
                    }
                    $scope.launchSearching();
                    $scope.filterApplied = true;
                }
            }

            $scope.applyFilter = function(event) {
                $scope.launchSearching();
            }

            $scope.launchSearchingQuick = function() {
                if (!$scope.filterApplied) {
                    $scope.search.oql = $scope.search.json = '';
                    $scope.config.filter = $scope.search.quick;
                    $scope.launchSearching();
                    $scope.filterApplied = true;
                }
            }

            var windowTimeChanged = $scope.$on('onWindowTimeChanged', function(event, timeObj) {
                $scope.config.windowFilter = timeObj ? timeObj : (config.windowFilter ? {} : timeObj);
                var widget = {
                    definition: definition,
                    element: $element
                }
                $rootScope.$broadcast('adfWindowTimeChangedFromWidget', widget, $scope.config.windowFilter);
                $scope.reload();
            });

            $scope.enter = function(event) {
                var keycode = (event.keyCode ? event.keyCode : event.which);
                if (keycode === 13) {
                    if ($scope.toggleAdvanced === 0)
                        $scope.launchSearchingAdv();
                    if ($scope.toggleAdvanced === 1)
                        $scope.launchSearchingQuick();
                    if ($scope.toggleAdvanced === 2)
                        $scope.launchCustomFilter();

                } else if (keycode === 19) {
                    $scope.showFinalFilter = $scope.showFinalFilter === false ? true : false;
                } else {
                    $scope.filterApplied = false;
                }
            }


            $scope.customSelectors = [];
            $scope.getCustomSelectors = function() {
                if ($scope.config.customSelectors) {
                    $scope.customSelectors = $scope.config.customSelectors;
                } else {
                    config.widgetSelectors().findFields("").then(function(fields) {
                        $scope.customSelectors = fields;
                        $scope.$apply();
                    }).catch(function(err) {
                        $log.error(err);
                    });
                }
            }

            $scope.customFilter = [];
            $scope.getcustomFilter = function() {
                config.widgetSelectors().findFields("").then(function(fields) {
                    $scope.customFilter = fields;
                    $scope.$apply();
                }).catch(function(err) {
                    $log.error(err);
                });

            }

            $scope.ifCustomFilter = function() {
                return $scope.customSelectors && config.sort && $scope.definition.type === 'FullDevicesList' && $scope.toggleAdvanced === 2;
            }

            $scope.showCustomFields = function() {
                return $scope.definition.type === 'FullDevicesList' && $scope.toggleAdvanced === 2 && $scope.search.customFilter && $scope.filterAvailable && !$scope.editMode;
            }

            $scope.changeDirection = function() {
                var direction = config.sort.direction;
                if (direction === 'DESCENDING') {
                    $scope.config.sort.direction = 'ASCENDING'
                } else if (direction === 'ASCENDING') {
                    $scope.config.sort.direction = 'DESCENDING'
                }
                $scope.reload();
            }

            $scope.changeDefaultTab = function() {


                $scope.reload();
            }

            $scope.debugQuery = function() {
                Filter.parseQuery($scope.search.oql || '')
                    .then(function(data) {
                        //$scope.elementos = data;
                        $scope.search.json = angular.toJson(data.filter, null, 4); // stringify with 4 spaces at each level;
                        $scope.unknownWords = '';
                        $scope.filter.error = null;
                    })
                    .catch(function(err) {
                        $scope.filter.error = err;
                        // Tratar el error
                    });

            }

            $scope.autocomplete_options = function() {
                var autocomplete_options = {
                    suggest: Filter.suggest_field_delimited,
                    customSelectors: config.widgetSelectors()
                };

                return autocomplete_options;

            };

            // Multiple selection
            $scope.selectedItems = {};

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

            $scope.manageSelectedItems = function() {
                var selectionScope = $scope.$new();

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
                        $scope.toggleAdvanced = 0;
                        Filter.parseQuery(customOql).then(function(data) {
                            $scope.search.oql = customOql;
                            $scope.search.json = angular.toJson(data.filter, null, 4); // stringify with 4 spaces at each level;
                            $scope.unknownWords = '';
                            $scope.filter.error = null;

                            $scope.launchSearchingAdv();
                        }).catch(function(err) {
                            $scope.filter.error = err;
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
            controller: function($scope) {
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
                    changeFilter: function(filter, search, toggleAdvanced) {
                        $scope.filter = filter;
                        $scope.search = search;
                        $scope.toggleAdvanced = toggleAdvanced;
                    }
                };

                // Controlador de las custom actions del widget
                $scope.widgetActionsHandler = {
                    actions: [],
                    setActions: function(actions) {
                        $scope.widgetActionsHandler.actions = actions;
                    }
                };
                $scope.showActionsMenu = false;
                $scope.toggleActionsMenu = function() {
                    $scope.showActionsMenu = !$scope.showActionsMenu;
                };

                var adfDashboardCollapseExpand = $scope.$on('adfDashboardCollapseExpand', function(event, args) {
                    $scope.widgetState.isCollapsed = args.collapseExpandStatus;
                });

                var adfWidgetEnterEditMode = $scope.$on('adfWidgetEnterEditMode', function(event, widget) {
                    if (dashboard.idEquals($scope.definition.wid, widget.wid)) {
                        $scope.edit();
                    }
                });

                var adfIsEditMode = $scope.$on('adfIsEditMode', function(event, widget) {
                    $scope.editing = true;
                });

                var adfDashboardChanged = $scope.$on('adfDashboardChanged', function(event, widget) {
                    $scope.editing = false;
                });

                var adfDashboardEditsCancelled = $scope.$on('adfDashboardEditsCancelled', function(event, widget) {
                    $scope.editing = false;
                });

                $scope.widgetClasses = function(w, definition) {
                    var classes = definition.styleClass || '';
                    // w is undefined, if the type of the widget is unknown
                    // see issue #216
                    // if (!w || !w.frameless || $scope.editMode) {
                    //     classes += ' panel panel-default';
                    // }
                    return classes;
                };

                $scope.openFullScreen = function() {

                    $scope.$emit('adfOpenModalWidgetFromOther', $scope.definition.type, $scope.config);

                    // var definition = $scope.definition;
                    // var fullScreenScope = $scope.$new();
                    // var opts = {
                    //     scope: fullScreenScope,
                    //     templateUrl: adfTemplatePath + 'widget-fullscreen.html',
                    //     size: definition.modalSize || 'lg', // 'sm', 'lg'
                    //     backdrop: 'static',
                    //     windowClass: (definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    // };

                    // var instance = $uibModal.open(opts);

                    // fullScreenScope.reload = function() {
                    //     fullScreenScope.$broadcast('widgetReload');
                    // };

                    // fullScreenScope.closeDialog = function() {
                    //     instance.close();
                    //     fullScreenScope.$destroy();
                    // };
                };

                $scope.openFilter = function() {

                }

                $scope.openAboutScreen = function(size) {
                    size = 'md';
                    var modalInstance = $uibModal.open({
                        animation: true,
                        templateUrl: 'widgetAboutModal.html',
                        controller: function($scope, $uibModalInstance, information) {
                            $scope.about = {};
                            $scope.about.info = information;
                            $scope.ok = function() {
                                $uibModalInstance.close();
                            };
                        },
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

                var onWindowTimeChanged = function(timeObj) {
                    var filter = {
                        and: []
                    };
                    if (timeObj && timeObj.from) {
                        filter.and.push({
                            gt: {
                                operationDate: timeObj.from
                            }
                        });

                        if (timeObj.to) {
                            filter.and.push({
                                lt: {
                                    operationDate: timeObj.to
                                }
                            });
                        }
                    } else {
                        filter = null;
                    }
                    return filter;
                }

                var createQuickFilter = function(fieldsQuickSearch, filter) {
                    var _filter = {
                        or: []
                    };
                    var criteria;
                    fieldsQuickSearch.forEach(function(field) {
                        criteria = {};
                        criteria[field.operator] = {};
                        criteria[field.operator][field.name] = $scope.config.filter;
                        _filter.or.push(criteria);
                    });
                    return _filter;
                }

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
                    if (scope_filter.value && scope_filter.value.length > 4) {
                        filter = JSON.parse(scope_filter.value);
                    } else if (typeof scope_filter === 'string' && scope_filter.trim() !== '') {
                        filter = createQuickFilter($scope.config.fieldsQuickSearch, scope_filter);
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
                                $interval.cancel(stopReloadTimeout)
                                stopReloadTimeout = undefined;
                            };
                            stopReloadTimeout = $interval($scope.reload, (reloadPeriod * 1000));
                        } else if (stopReloadTimeout) {
                            $interval.cancel(stopReloadTimeout);
                        }
                    }
                }

                $scope.reload = function(completeReload) {
                    if (completeReload) {
                        $scope.$broadcast('widgetReload', completeReload);
                    } else {
                        $scope.$broadcast('widgetReload');
                    }

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
            },
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

    });