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
    .directive('adfWidgetGrid', function($injector, $q, $log, $uibModal, $rootScope, $interval, dashboard, adfTemplatePath, Filter, queryService, $timeout, $api, toastr, $translate) {
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
            controller: function($scope, $element) {
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