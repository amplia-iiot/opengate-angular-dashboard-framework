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



angular.module('adf', ['adf.provider', 'adf.locale', 'ui.bootstrap', 'opengate-angular-js'])
    .value('adfTemplatePath', '../src/templates/')
    .value('rowTemplate', '<adf-dashboard-row row="row" adf-model="adfModel" options="options" edit-mode="editMode" ng-repeat="row in column.rows" />')
    .value('columnTemplate', '<adf-dashboard-column column="column" adf-model="adfModel" options="options" edit-mode="editMode" ng-repeat="column in row.columns" />')
    .value('adfVersion', '2.5.0');
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



angular.module('adf.locale', [])

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
  .directive('adfDashboardColumn', ["$log", "$compile", "$rootScope", "adfTemplatePath", "rowTemplate", "dashboard", function ($log, $compile, $rootScope, adfTemplatePath, rowTemplate, dashboard) {
    

    /**
     * moves a widget in between a column
     */
    function moveWidgetInColumn($scope, column, evt){
      var widgets = column.widgets;
      // move widget and apply to scope
      $scope.$apply(function(){
        widgets.splice(evt.newIndex, 0, widgets.splice(evt.oldIndex, 1)[0]);
        $rootScope.$broadcast('adfWidgetMovedInColumn');
      });
    }

    /**
     * finds a widget by its id in the column
     */
    function findWidget(column, index){
      var widget = null;
      for (var i=0; i<column.widgets.length; i++){
        var w = column.widgets[i];
        if (dashboard.idEquals(w.wid,index)){
          widget = w;
          break;
        }
      }
      return widget;
    }

    /**
     * finds a column by its id in the model
     */
    function findColumn(model, index){
      var column = null;
      for (var i=0; i<model.rows.length; i++){
        var r = model.rows[i];
        for (var j=0; j<r.columns.length; j++){
          var c = r.columns[j];
          if (dashboard.idEquals(c.cid, index)){
            column = c;
            break;
          } else if (c.rows){
            column = findColumn(c, index);
          }
        }
        if (column){
          break;
        }
      }
      return column;
    }

    /**
     * get the adf id from an html element
     */
    function getId(el){
      var id = el.getAttribute('adf-id');
      return id ? id : '-1';
    }

    /**
     * adds a widget to a column
     */
    function addWidgetToColumn($scope, model, targetColumn, evt){
      // find source column
      var cid = getId(evt.from);
      var sourceColumn = findColumn(model, cid);

      if (sourceColumn){
        // find moved widget
        var wid = getId(evt.item);
        var widget = findWidget(sourceColumn, wid);

        if (widget){
          // add new item and apply to scope
          $scope.$apply(function(){
            if (!targetColumn.widgets) {
              targetColumn.widgets = [];
            }
            targetColumn.widgets.splice(evt.newIndex, 0, widget);

            $rootScope.$broadcast('adfWidgetAddedToColumn');
          });
        } else {
          $log.warn('could not find widget with id ' + wid);
        }
      } else {
        $log.warn('could not find column with id ' + cid);
      }
    }

    /**
     * removes a widget from a column
     */
    function removeWidgetFromColumn($scope, column, evt){
      // remove old item and apply to scope
      $scope.$apply(function(){
        column.widgets.splice(evt.oldIndex, 1);
        $rootScope.$broadcast('adfWidgetRemovedFromColumn');
      });
    }

    /**
     * enable sortable
     */
    function applySortable($scope, $element, model, column){
      // enable drag and drop
      var el = $element[0];
      var sortable = Sortable.create(el, {
        group: 'widgets',
        handle: '.adf-move',
        ghostClass: 'placeholder',
        animation: 150,
        onAdd: function(evt){
          addWidgetToColumn($scope, model, column, evt);
        },
        onRemove: function(evt){
          removeWidgetFromColumn($scope, column, evt);
        },
        onUpdate: function(evt){
          moveWidgetInColumn($scope, column, evt);
        }
      });

      // destroy sortable on column destroy event
      $element.on('$destroy', function () {
        // check sortable element, before calling destroy
        // see https://github.com/sdorra/angular-dashboard-framework/issues/118
        if (sortable.el){
          sortable.destroy();
        }
      });
    }

    return {
      restrict: 'E',
      replace: true,
      scope: {
        column: '=',
        editMode: '=',
        continuousEditMode: '=',
        adfModel: '=',
        options: '='
      },
      templateUrl: adfTemplatePath + 'dashboard-column.html',
      link: function ($scope, $element) {
        // set id
        var col = $scope.column;
        if (!col.cid){
          col.cid = dashboard.id();
        }

        if (angular.isDefined(col.rows) && angular.isArray(col.rows)) {
          // be sure to tell Angular about the injected directive and push the new row directive to the column
          $compile(rowTemplate)($scope, function(cloned) {
            $element.append(cloned);
          });
        } else {
          // enable drag and drop for widget only columns
          applySortable($scope, $element, $scope.adfModel, col);
        }
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
 * @param {string=} structure the default structure of the dashboard.
 * @param {object=} adfModel model object of the dashboard.
 * @param {function=} adfWidgetFilter function to filter widgets on the add dialog.
 * @param {boolean=} continuousEditMode enable continuous edit mode, to fire add/change/remove
 *                   events during edit mode not reset it if edit mode is exited.
 * @param {boolean=} categories enable categories for the add widget dialog.
 */

angular.module('adf')
    .directive('adfDashboard', ["$rootScope", "$log", "$timeout", "$uibModal", "dashboard", "adfTemplatePath", "$faIcons", function($rootScope, $log, $timeout, $uibModal, dashboard, adfTemplatePath, $faIcons) {
        

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

        function copyWidgets(source, target) {
            if (source.widgets && source.widgets.length > 0) {
                var w = source.widgets.shift();
                while (w) {
                    target.widgets.push(w);
                    w = source.widgets.shift();
                }
            }
        }

        /**
         * Copy widget from old columns to the new model
         * @param object root the model
         * @param array of columns
         * @param counter
         */
        function fillStructure(root, columns, counter) {
            counter = counter || 0;

            if (angular.isDefined(root.rows)) {
                angular.forEach(root.rows, function(row) {
                    angular.forEach(row.columns, function(column) {
                        // if the widgets prop doesn't exist, create a new array for it.
                        // this allows ui.sortable to do it's thing without error
                        if (!column.widgets) {
                            column.widgets = [];
                        }

                        // if a column exist at the counter index, copy over the column
                        if (angular.isDefined(columns[counter])) {
                            // do not add widgets to a column, which uses nested rows
                            if (angular.isUndefined(column.rows)) {
                                copyWidgets(columns[counter], column);
                                counter++;
                            }
                        }

                        // run fillStructure again for any sub rows/columns
                        counter = fillStructure(column, columns, counter);
                    });
                });
            }
            return counter;
        }

        /**
         * Read Columns: recursively searches an object for the 'columns' property
         * @param object model
         * @param array  an array of existing columns; used when recursion happens
         */
        function readColumns(root, columns) {
            columns = columns || [];

            if (angular.isDefined(root.rows)) {
                angular.forEach(root.rows, function(row) {
                    angular.forEach(row.columns, function(col) {
                        columns.push(col);
                        // keep reading columns until we can't any more
                        readColumns(col, columns);
                    });
                });
            }

            return columns;
        }

        function changeStructure(model, structure) {
            var columns = readColumns(model);
            var counter = 0;

            model.rows = angular.copy(structure.rows);

            while (counter < columns.length) {
                counter = fillStructure(model, columns, counter);
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
         * Find first widget column in model.
         *
         * @param dashboard model
         */
        function findFirstWidgetColumn(model) {
            var column = null;
            if (!angular.isArray(model.rows)) {
                $log.error('model does not have any rows');
                return null;
            }
            for (var i = 0; i < model.rows.length; i++) {
                var row = model.rows[i];
                if (angular.isArray(row.columns)) {
                    for (var j = 0; j < row.columns.length; j++) {
                        var col = row.columns[j];
                        if (!col.rows) {
                            column = col;
                            break;
                        }
                    }
                }
                if (column) {
                    break;
                }
            }
            return column;
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
                var column = findFirstWidgetColumn(model);
                if (column) {
                    if (!column.widgets) {
                        column.widgets = [];
                    }
                    column.widgets.unshift(widget);

                    // broadcast added event
                    $rootScope.$broadcast('adfWidgetAdded', name, model, widget);

                    if (forceToSave) {
                        $rootScope.$broadcast('adfDashboardChanged', name, model);
                    }
                } else {
                    $log.error('could not find first widget column');
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
                    category = 'Miscellaneous';
                }
                // push widget to category array
                if (angular.isUndefined(categories[category])) {
                    categories[category] = { widgets: {} };
                }
                categories[category].widgets[key] = widget;
            });
            return categories;
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            scope: {
                structure: '@',
                name: '@',
                collapsible: '@',
                editable: '@',
                editMode: '@',
                continuousEditMode: '=',
                maximizable: '@',
                adfModel: '=',
                adfWidgetFilter: '=',
                categories: '@',
                hideButtons: '='
            },
            controller: ["$scope", function($scope) {
                var model = {};
                var structure = {};
                var widgetFilter = null;
                var structureName = {};
                var name = $scope.name;

                // Watching for changes on adfModel
                $scope.$watch('adfModel', function(oldVal, newVal) {
                    // has model changed or is the model attribute not set
                    if (newVal !== null || (oldVal === null && newVal === null)) {
                        model = $scope.adfModel;
                        widgetFilter = $scope.adfWidgetFilter;
                        if (!model || !model.rows) {
                            structureName = $scope.structure;
                            structure = dashboard.structures[structureName];
                            if (structure) {
                                if (model) {
                                    model.rows = angular.copy(structure).rows;
                                } else {
                                    model = angular.copy(structure);
                                }
                                model.structure = structureName;
                            } else {
                                $log.error('could not find structure ' + structureName);
                            }
                        }

                        if (model) {
                            if (!model.title) {
                                model.title = 'Empty Dashboard';
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

                //passs translate function from dashboard so we can translate labels inside html templates
                $scope.translate = dashboard.translate;

                function getNewModalScope() {
                    var scope = $scope.$new();
                    //pass translate function to the new scope so we can translate the labels inside the modal dialog
                    scope.translate = dashboard.translate;
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

                $scope.collapseAll = function(collapseExpandStatus) {
                    $rootScope.$broadcast('adfDashboardCollapseExpand', { collapseExpandStatus: collapseExpandStatus });
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
                        title: (model.title !== 'Empty Dashboard' ? model.title : ''),
                        description: model.description,
                        icon: model.icon ? model.icon : 'fa-tachometer'
                    };

                    // pass icon list
                    editDashboardScope.availableIcons = $faIcons.list();

                    // pass dashboard structure to scope
                    editDashboardScope.structures = dashboard.structures;

                    // pass split function to scope, to be able to display structures in multiple columns
                    editDashboardScope.split = split;

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

                    editDashboardScope.changeStructure = function(name, structure) {
                        $log.info('change structure to ' + name);
                        changeStructure(model, structure);
                        if (model.structure !== name) {
                            model.structure = name;
                        }
                    };
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
                        templateUrl: adfTemplatePath + 'widget-fullscreen.html',
                        size: fullScreenScope.definition.modalSize || 'lg', // 'sm', 'lg'
                        backdrop: 'static',
                        windowClass: (fullScreenScope.definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    };

                    fullScreenScope.persistDashboard = function() {
                        $rootScope.$broadcast('adfOpenWidgetFromOther', this.$parent.widget.type, this.$parent.widget.config);
                        this.closeDialog();
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

                    //pass translate function to the new scope so we can translate the labels inside the modal dialog
                    addScope.translate = $scope.translate;

                    // pass createCategories function to scope, if categories option is enabled
                    if ($scope.options.categories) {
                        $scope.createCategories = createCategories;
                    }

                    var adfAddTemplatePath = adfTemplatePath + 'widget-add.html';
                    if (model.addTemplateUrl) {
                        adfAddTemplatePath = model.addTemplateUrl;
                    }

                    var opts = {
                        scope: addScope,
                        templateUrl: adfAddTemplatePath,
                        backdrop: 'static'
                    };

                    var instance = $uibModal.open(opts);
                    addScope.addWidget = function(widget) {
                        var w = {
                            type: widget,
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
                    categories: stringToBoolean($attr.categories)
                };
                if (angular.isDefined($attr.editable)) {
                    options.editable = stringToBoolean($attr.editable);
                }
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
 * @name adf.locale#adfLocale
 * @description
 *
 * Holds settings and values for framework supported locales
 */
angular.module('adf.locale')
    .constant('adfLocale', {
        defaultLocale: 'en-GB',
        frameworkLocales: {
            'en-GB': {
                ADF_COMMON_CLOSE: 'Close',
                ADF_COMMON_DELETE: 'Delete',
                ADF_COMMON_TITLE: 'Title',
                ADF_COMMON_DESCRIPTION: 'Description',
                ADF_COMMON_CANCEL: 'Cancel',
                ADF_COMMON_APPLY: 'Apply',
                ADF_COMMON_EDIT_DASHBOARD: 'Edit dashboard',
                ADF_EDIT_DASHBOARD_STRUCTURE_LABEL: 'Structure',
                ADF_DASHBOARD_TITLE_TOOLTIP_ADD: 'Add new widget',
                ADF_DASHBOARD_TITLE_TOOLTIP_SAVE: 'Save changes',
                ADF_DASHBOARD_TITLE_TOOLTIP_EDIT_MODE: 'Enable edit mode',
                ADF_DASHBOARD_TITLE_TOOLTIP_UNDO: 'Undo changes',
                ADF_WIDGET_ADD_HEADER: 'Add new widget',
                ADF_WIDGET_DELETE_CONFIRM_MESSAGE: 'Are you sure you want to delete this widget ?',
                ADF_WIDGET_TOOLTIP_REFRESH: 'Reload widget Content',
                ADF_WIDGET_TOOLTIP_PRINT: 'Print widget Content',
                ADF_WIDGET_TOOLTIP_FILTER: 'Show widget Filter',
                ADF_WIDGET_TOOLTIP_SORT: 'Show widget Sort',
                ADF_WIDGET_TOOLTIP_MOVE: 'Change widget location',
                ADF_WIDGET_TOOLTIP_COLLAPSE: 'Collapse widget',
                ADF_WIDGET_TOOLTIP_EXPAND: 'Expand widget',
                ADF_WIDGET_TOOLTIP_EDIT: 'Edit widget configuration',
                ADF_WIDGET_TOOLTIP_FULLSCREEN: 'Fullscreen widget',
                ADF_WIDGET_TOOLTIP_REMOVE: 'Remove widget',
                ADF_WIDGET_TOOLTIP_OPERATION: 'Execute operation',
                ADF_WIDGET_TOOLTIP_SELECTION: 'Items selected',
                ADF_WIDGET_CLEAR: 'Clear',
                ADF_WIDGET_RESTORE: 'Restore',
                ADF_WIDGET_FILTER: 'Filter'
            },
            'sv-SE': {
                ADF_COMMON_CLOSE: 'Stäng',
                ADF_COMMON_DELETE: 'Ta bort',
                ADF_COMMON_TITLE: 'Titel',
                ADF_COMMON_DESCRIPTION: 'Description',
                ADF_COMMON_CANCEL: 'Avbryt',
                ADF_COMMON_APPLY: 'Använd',
                ADF_COMMON_EDIT_DASHBOARD: 'Redigera dashboard',
                ADF_EDIT_DASHBOARD_STRUCTURE_LABEL: 'Struktur',
                ADF_DASHBOARD_TITLE_TOOLTIP_ADD: 'Lägg till ny widget',
                ADF_DASHBOARD_TITLE_TOOLTIP_SAVE: 'Spara förändringar',
                ADF_DASHBOARD_TITLE_TOOLTIP_EDIT_MODE: 'Slå på redigeringsläge',
                ADF_DASHBOARD_TITLE_TOOLTIP_UNDO: 'Ångra förändringar',
                ADF_WIDGET_ADD_HEADER: 'Lägg till ny widget',
                ADF_WIDGET_DELETE_CONFIRM_MESSAGE: 'Är du säker på att du vill ta bort denna widget ?',
                ADF_WIDGET_TOOLTIP_REFRESH: 'Ladda om widget',
                ADF_WIDGET_TOOLTIP_FILTER: 'Show widget Filter',
                ADF_WIDGET_TOOLTIP_SORT: 'Show widget Sort',
                ADF_WIDGET_TOOLTIP_MOVE: 'Ändra widgets position',
                ADF_WIDGET_TOOLTIP_COLLAPSE: 'Stäng widget',
                ADF_WIDGET_TOOLTIP_EXPAND: 'Öppna widget',
                ADF_WIDGET_TOOLTIP_EDIT: 'Ändra widget konfigurering',
                ADF_WIDGET_TOOLTIP_FULLSCREEN: 'Visa widget i fullskärm',
                ADF_WIDGET_TOOLTIP_REMOVE: 'Ta bort widget',
                ADF_WIDGET_TOOLTIP_OPERATION: 'Execute operation',
                ADF_WIDGET_TOOLTIP_SELECTION: 'Items selected',
                ADF_WIDGET_CLEAR: 'Clear',
                ADF_WIDGET_RESTORE: 'Restore',
                ADF_WIDGET_FILTER: 'Filter'
            }
        }
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
 * The dashboardProvider can be used to register structures and widgets.
 */
angular.module('adf.provider', ['adf.locale'])
  .provider('dashboard', ["adfLocale", function(adfLocale){

    var widgets = {};
    var widgetsPath = '';
    var structures = {};
    var messageTemplate = '<div class="alert alert-danger">{}</div>';
    var loadingTemplate = '\
      <div class="progress progress-striped active">\n\
        <div class="progress-bar" role="progressbar" style="width: 100%">\n\
          <span class="sr-only">loading ...</span>\n\
        </div>\n\
      </div>';
    var customWidgetTemplatePath = null;

    // default apply function of widget.edit.apply
    var defaultApplyFunction = function(){
      return true;
    };

    var activeLocale = adfLocale.defaultLocale;
    var locales = adfLocale.frameworkLocales;

    function getLocales() {
      return locales;
    }

    function getActiveLocale() {
      return activeLocale;
    }

    function translate(label) {
      var translation = locales[activeLocale][label];
      return translation ? translation : label;
    }

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
    this.widget = function(name, widget){
      var w = angular.extend({reload: false, frameless: false}, widget);
      if ( w.edit ){
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
    this.widgetsPath = function(path){
      widgetsPath = path;
      return this;
    };

   /**
    * @ngdoc method
    * @name adf.dashboardProvider#structure
    * @methodOf adf.dashboardProvider
    * @description
    *
    * Registers a new structure.
    *
    * @param {string} name of the structure
    * @param {object} structure to be registered.
    *
    *   Object properties:
    *
    *   - `rows` - `{Array.<Object>}` - Rows of the dashboard structure.
    *     - `styleClass` - `{string}` - CSS Class of the row.
    *     - `columns` - `{Array.<Object>}` - Columns of the row.
    *       - `styleClass` - `{string}` - CSS Class of the column.
    *
    * @returns {Object} self
    */
    this.structure = function(name, structure){
      structures[name] = structure;
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
    this.messageTemplate = function(template){
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
    this.loadingTemplate = function(template){
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
     * @ngdoc method
     * @name adf.dashboardProvider#setLocale
     * @methodOf adf.dashboardProvider
     * @description
     *
     * Changes the locale setting of adf
     *
     * @param {string} ISO Language Code
     *
     * @returns {Object} self
     */
     this.setLocale = function(locale){
       if(locales[locale]) {
         activeLocale = locale;
       } else {
         throw new Error('Cannot set locale: ' + locale + '. Locale is not defined.');
       }
       return this;
     };

     /**
      * @ngdoc method
      * @name adf.dashboardProvider#addLocale
      * @methodOf adf.dashboardProvider
      * @description
      *
      * Adds a new locale to adf
      *
      * @param {string} ISO Language Code for the new locale
      * @param {object} translations for the locale.
      *
      * @returns {Object} self
      */
      this.addLocale = function(locale, translations){
        if(!angular.isString(locale)) {
          throw new Error('locale must be an string');
        }

        if(!angular.isObject(translations)) {
          throw new Error('translations must be an object');
        }

        locales[locale] = translations;
        return this;
      };

   /**
    * @ngdoc service
    * @name adf.dashboard
    * @description
    *
    * The dashboard holds all options, structures and widgets.
    *
    * @property {Array.<Object>} widgets Array of registered widgets.
    * @property {string} widgetsPath Default path for widgets.
    * @property {Array.<Object>} structures Array of registered structures.
    * @property {string} messageTemplate Template for messages.
    * @property {string} loadingTemplate Template for widget loading.
    * @property {method} sets locale of adf.
    * @property {Array.<Object>} hold all of the locale translations.
    * @property {string} the active locale setting.
    * @property {method} translation function passed to templates.
    *
    * @returns {Object} self
    */
    this.$get = function(){
      var cid = 0;

      return {
        widgets: widgets,
        widgetsPath: widgetsPath,
        structures: structures,
        messageTemplate: messageTemplate,
        loadingTemplate: loadingTemplate,
        setLocale: this.setLocale,
        locales: getLocales,
        activeLocale: getActiveLocale,
        translate: translate,
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
        id: function(){
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
         idEquals: function(id, other){
           // use toString, because old ids are numbers
           return ((id) && (other)) && (id.toString() === other.toString());
         }
      };
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
  .directive('adfDashboardRow', ["$compile", "adfTemplatePath", "columnTemplate", function ($compile, adfTemplatePath, columnTemplate) {
    

    return {
      restrict: 'E',
      replace: true,
      scope: {
        row: '=',
        adfModel: '=',
        editMode: '=',
        continuousEditMode: '=',
        options: '='
      },
      templateUrl: adfTemplatePath + 'dashboard-row.html',
      link: function($scope, $element) {
        if (angular.isDefined($scope.row.columns) && angular.isArray($scope.row.columns)) {
          $compile(columnTemplate)($scope, function(cloned) {
            $element.append(cloned);
          });
        }
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



/* global angular */
angular.module('adf')
  .directive('adfStructurePreview', ["adfTemplatePath", function(adfTemplatePath) {

    function adjustRowHeight(container){
      if (container.rows && container.rows.length > 0){
        var height = 100 / container.rows.length;
        angular.forEach(container.rows, function(row){
          row.style = {
            height: height + '%'
          }

          if (row.columns){
            angular.forEach(row.columns, function(column){
              adjustRowHeight(column);
            });
          }
        });
      }
    }

    function prepareStructure($scope){
      var structure = angular.copy($scope.structure);
      adjustRowHeight(structure);
      $scope.preview = structure;
    }

    return {
      restrict: 'E',
      replace: true,
      scope: {
        name: '=',
        structure: '=',
        selected: '='
      },
      templateUrl: adfTemplatePath + 'structure-preview.html',
      link: prepareStructure
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
    .directive('adfWidgetContent', ["$log", "$q", "widgetService", "$compile", "$controller", "$injector", "dashboard", function($log, $q, widgetService,
        $compile, $controller, $injector, dashboard) {

        function renderError($element, msg) {
            $log.warn(msg);
            $element.html(dashboard.messageTemplate.replace(/{}/g, msg));
        }

        function compileWidget($scope, $element, currentScope, configChanged) {
            var model = $scope.model;
            var content = $scope.content;
            var editing = $scope.editing;

            var newScope = currentScope;
            if (!model) {
                renderError($element, 'model is undefined')
            } else if (!content) {
                var msg = 'widget content is undefined, please have a look at your browser log';
                renderError($element, msg);
            } else {
                if (newScope && newScope.menu !== undefined) { //adf-widget-browser
                    newScope = renderWidget($scope, $element, currentScope, model, content);
                } else {
                    if (newScope && newScope.reloadData && !configChanged) {
                        if (newScope.itemsPerPage !== undefined && isNaN(newScope.itemsPerPage)) {
                            newScope = renderWidget($scope, $element, currentScope, model, content);
                        } else {
                            newScope.reloadData();
                        }
                    } else if (newScope && newScope.reloadData && newScope.needConfiguration !== undefined && !newScope.needConfiguration) {
                        newScope.reloadData();
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

            newScope.editing = editing ? editing : false;
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
                $scope.$on('widgetConfigChanged', function() {
                    currentScope = compileWidget($scope, $element, currentScope, true);
                });
                $scope.$on('widgetReload', function() {
                    currentScope = compileWidget($scope, $element, currentScope, false);
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
    .directive('adfWidget', ["$injector", "$q", "$log", "$uibModal", "$rootScope", "$interval", "dashboard", "adfTemplatePath", "Filter", function($injector, $q, $log, $uibModal, $rootScope, $interval, dashboard, adfTemplatePath, Filter) {
        function preLink($scope) {
            var definition = $scope.definition;

            //passs translate function from dashboard so we can translate labels inside html templates
            $scope.translate = dashboard.translate;

            if (definition) {
                var w = dashboard.widgets[definition.type];
                if (w) {
                    // pass title
                    if (!definition.title) {
                        definition.title = w.title;
                    }

                    if (!definition.titleTemplateUrl) {
                        definition.titleTemplateUrl = adfTemplatePath + 'widget-title.html';
                        if (w.titleTemplateUrl) {
                            definition.titleTemplateUrl = w.titleTemplateUrl;
                        }
                    }

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

                    if (!config.reloadPeriod) {
                        config.reloadPeriod = "0";
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
            if (definition) {
                if (!$scope.config.reloadPeriod) {
                    $scope.config.reloadPeriod = "0";
                }

                // bind close function
                var deleteWidget = function() {
                    var column = $scope.col;
                    if (column) {
                        var index = column.widgets.indexOf(definition);
                        if (index >= 0) {
                            column.widgets.splice(index, 1);
                        }
                    }
                    $element.remove();
                    $rootScope.$broadcast('adfWidgetRemovedFromColumn');
                };

                $scope.remove = function() {
                    if ($scope.options.enableConfirmDelete) {
                        var deleteScope = $scope.$new();
                        deleteScope.translate = dashboard.translate;

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
                    if ($scope.selectedItemsLength > 0)
                        return true;
                    if ($scope.config.entityKey)
                        return true;
                    if (typeof $scope.config.filter === "string") {
                        return $scope.config.filter.length > 0;
                    }
                    if (typeof $scope.config.filter === "object") {
                        return $scope.config.filter.value.length > 2 && $scope.config.filter.oql;
                    }
                    return false;
                }

                $scope.executeOperation = function() {
                    if (!$scope.editMode) {
                        $scope.$parent.$broadcast('widgetExecuteOperation');
                    }
                };

                // bind reload function
                var stopReloadTimeout;

                function _setReloadTimeout() {
                    if ($scope.config && $scope.config && $scope.config.reloadPeriod && $scope.config.reloadPeriod !== "0") {
                        if (angular.isDefined(stopReloadTimeout)) {
                            $interval.cancel(stopReloadTimeout)
                            stopReloadTimeout = undefined;
                        };
                        stopReloadTimeout = $interval($scope.reload, ($scope.config.reloadPeriod * 1000));
                    }
                }

                $scope.reload = function() {
                    $scope.$broadcast('widgetReload');
                    _setReloadTimeout();
                };

                // verificacion de periodo de refresco
                _setReloadTimeout();

                $element.on('$destroy', function() {
                    $interval.cancel(stopReloadTimeout);
                });

                $scope.filter = {
                    value: ""
                };
                $scope.sort = {
                    value: "",
                    direction: ""
                };

                $scope.toggleAdvanced = 1;
                if (typeof $scope.config.filter === "object" && $scope.config.filter.oql && $scope.config.filter.oql.length > 2) {
                    $scope.search = {
                        oql: $scope.config.filter.oql,
                        json: $scope.config.filter.value
                    };
                    $scope.toggleAdvanced = 0;
                } else if (typeof $scope.config.filter === "string") {
                    $scope.search = {
                        quick: $scope.config.filter
                    };
                    $scope.toggleAdvanced = 1;
                } else if (typeof $scope.config.filter === "object" && $scope.config.filter.fields) {
                    $scope.search = {
                        customFilter: $scope.config.filter.fields
                    };
                    $scope.search.fields = [];
                    angular.forEach($scope.config.filter.fields, function(v, key) {
                        $scope.search.fields.push(v.name);
                    });
                    $scope.toggleAdvanced = 2;
                } else {
                    $scope.search = {
                        quick: $scope.config.filter = ""
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
                    $scope.reload();
                }
                $scope.addCustomFilter = function(key) {
                    $scope.search.customFilter = $scope.search.customFilter ? $scope.search.customFilter : [];
                    $scope.search.customFilter.push({ name: key, value: '' });
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
                                $scope.config.filter.value.and.push({ 'like': like });
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
                    $scope.search.quick = '';
                    $scope.config.filter = {
                        oql: $scope.search.oql,
                        value: $scope.search.json
                    };
                    if ($scope.search.json === '')
                        $scope.config.filter = {
                            oql: '',
                            value: ''
                        };
                    $scope.launchSearching();

                }

                $scope.applyFilter = function(event) {
                    $scope.launchSearching();
                }

                $scope.launchSearchingQuick = function() {
                    $scope.search.oql = $scope.search.json = '';
                    $scope.config.filter = $scope.search.quick;
                    $scope.launchSearching();
                }

                var windowTimeChanged = $scope.$on('onWindowTimeChanged', function(event, timeObj) {
                    $scope.config.windowFilter = timeObj ? timeObj : ($scope.config.windowFilter ? {} : timeObj);
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

                    }
                    if (keycode === 19) {
                        $scope.showFinalFilter = $scope.showFinalFilter === false ? true : false;
                    }
                }


                $scope.customSelectors = [];
                $scope.getCustomSelectors = function() {
                    $scope.config.widgetSelectors().findFields("").then(function(fields) {
                        $scope.customSelectors = fields;
                        $scope.$apply();
                    }).catch(function(err) {
                        $log.error(err);
                    });

                }

                $scope.customFilter = [];
                $scope.getcustomFilter = function() {
                    $scope.config.widgetSelectors().findFields("").then(function(fields) {
                        $scope.customFilter = fields;
                        $scope.$apply();
                    }).catch(function(err) {
                        $log.error(err);
                    });

                }

                $scope.ifCustomFilter = function() {
                    return $scope.customSelectors && $scope.config.sort && $scope.definition.type === 'FullDevicesList' && $scope.toggleAdvanced === 2;
                }

                $scope.showCustomFields = function() {
                    return $scope.definition.type === 'FullDevicesList' && $scope.toggleAdvanced === 2 && $scope.search.customFilter && $scope.filterAvailable && !$scope.editMode;
                }

                $scope.changeDirection = function() {
                    if ($scope.config.sort.direction === 'DESCENDING') {
                        $scope.config.sort.direction = 'ASCENDING'
                    } else if ($scope.config.sort.direction === 'ASCENDING') {
                        $scope.config.sort.direction = 'DESCENDING'
                    }
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
                        customSelectors: $scope.config.widgetSelectors()
                    };

                    return autocomplete_options;

                };

                // Multiple selection
                $scope.selectedItems = {};

                // Gestor de seleccion
                $scope.selectionManager = {
                    currentSelection: $scope.selectedItems,
                    isSelected: function(key) {
                        return $scope.selectedItems[key] ? true : false;
                    },
                    totalSelected: function() {
                        return $scope.selectedItemsLength;
                    }
                };

                $scope.manageSelectedItems = function() {
                    var selectionScope = $scope.$new();

                    selectionScope.filterOnSelection = $scope.config.filterOnSelection;

                    selectionScope.selectedItems = [];
                    angular.forEach($scope.selectedItems, function(value, key) {
                        selectionScope.selectedItems.push({ key: key, value: value });
                    });

                    selectionScope.currentSelection = {
                        selected: selectionScope.selectedItems
                    };

                    var manageItemsSelectedTemplate = adfTemplatePath + 'widget-selection.html';
                    var opts = {
                        scope: selectionScope,
                        templateUrl: manageItemsSelectedTemplate,
                        backdrop: 'static',
                        size: 'md',
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
                    selectionScope.applyFilter = function() {
                        selectionScope.filterOnSelection(selectionScope.currentSelection.selected);
                    };

                    selectionScope.executeOperation = function() {
                        if (!$scope.editMode) {
                            $scope.$parent.$broadcast('widgetExecuteOperation', { 'selectedItems': selectionScope.currentSelection.selected });
                        }
                    };

                    // Cierra sy guarda los datos de nueva selección
                    selectionScope.saveChangesDialog = function() {
                        var finalSelection = {};
                        angular.forEach(selectionScope.currentSelection.selected, function(data, idx) {
                            finalSelection[data.key] = data.value;
                        });

                        $scope.selectedItems = angular.copy(finalSelection);
                        $scope.selectedItemsLength = Object.keys($scope.selectedItems).length;

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
                    editScope.translate = dashboard.translate;
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
                                // reload content after edit dialog is closed
                                $scope.$broadcast('widgetConfigChanged');
                            }
                        }, function(err) {
                            if (err) {
                                editScope.validationError = err;
                            } else {
                                editScope.validationError = 'Validation durring apply failed';
                            }
                        });
                    };

                };

            } else {
                $log.debug('widget not found');
            }
        }

        return {
            replace: true,
            restrict: 'EA',
            transclude: false,
            templateUrl: dashboard.customWidgetTemplatePath ? dashboard.customWidgetTemplatePath : adfTemplatePath + 'widget.html',
            scope: {
                definition: '=',
                col: '=column',
                editMode: '=',
                options: '=',
                widgetState: '='
            },
            controller: ["$scope", function($scope) {
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
                    if (!w || !w.frameless || $scope.editMode) {
                        classes += ' panel panel-default';
                    }
                    return classes;
                };

                $scope.openFullScreen = function() {
                    var definition = $scope.definition;
                    var fullScreenScope = $scope.$new();
                    var opts = {
                        scope: fullScreenScope,
                        templateUrl: adfTemplatePath + 'widget-fullscreen.html',
                        size: definition.modalSize || 'lg', // 'sm', 'lg'
                        backdrop: 'static',
                        windowClass: (definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
                    };

                    var instance = $uibModal.open(opts);
                    fullScreenScope.closeDialog = function() {
                        instance.close();
                        fullScreenScope.$destroy();
                    };
                };

                $scope.openFilter = function() {

                }

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


                var addItemToSelection = $scope.$on('addItemToSelection', function(event, item) {
                    if (!$scope.selectedItems[item.key]) {
                        $scope.selectedItems[item.key] = item.data;
                        $scope.selectedItemsLength = Object.keys($scope.selectedItems).length;
                        $scope.$broadcast('widgetSelectionChanged', $scope.selectionManager);
                    }

                });

                var removeItemToSelection = $scope.$on('removeItemToSelection', function(event, item) {
                    if ($scope.selectedItems[item.key]) {
                        delete $scope.selectedItems[item.key];
                        $scope.selectedItemsLength = Object.keys($scope.selectedItems).length;
                        $scope.$broadcast('widgetSelectionChanged', $scope.selectionManager);
                    }
                });

                $scope.$on('$destroy', function() {
                    adfDashboardCollapseExpand();
                    adfWidgetEnterEditMode();
                    adfIsEditMode();
                    adfDashboardChanged();
                    adfDashboardEditsCancelled();
                    addItemToSelection();
                    removeItemToSelection();
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
angular.module("adf").run(["$templateCache", function($templateCache) {$templateCache.put("../src/templates/dashboard-column.html","<div adf-id={{column.cid}} class=column ng-class=column.styleClass ng-model=column.widgets> <adf-widget ng-repeat=\"definition in column.widgets\" definition=definition column=column edit-mode=editMode options=options widget-state=widgetState>  </adf-widget></div> ");
$templateCache.put("../src/templates/dashboard-edit.html","<div class=modal-header> <button type=button class=close ng-click=closeDialog() aria-hidden=true>&times;</button> <h3 class=modal-title ng-bind=\"translate(\'ADF_COMMON_EDIT_DASHBOARD\')\">Edit Dashboard</h3> </div> <div class=modal-body> <form role=form name=form novalidate> <div class=\"form-group col-xs-12 col-md-6\"> <label for=dashboardTitle ng-bind=\"translate(\'ADF_COMMON_TITLE\')\">Title</label> <input type=text class=\"form-control text-primary\" id=dashboardTitle ng-model=copy.title required> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=dashboardDescription ng-bind=\"translate(\'ADF_COMMON_DESCRIPTION\')\">Description</label> <input type=text class=\"form-control text-primary\" id=dashboardDescription ng-model=copy.description> </div> <div class=\"form-group col-xs-12 col-md-6\"> <label for=icon>Icon</label> <ui-select tagging=tagTransform id=icon ng-model=copy.icon theme=bootstrap allow-clear=false required=true on-select=selectIcon($select.selected) title=\"Choose icon\"> <ui-select-match placeholder=\"Choose icon\" allow-clear=false> <i class=\"fa {{$select.selected}} fa-2x\"></i> <span>{{$select.selected}}</span> </ui-select-match> <ui-select-choices class=oux-icon-selector repeat=\"iconTmp in availableIcons | filter: $select.search\"> <i class=\"fa fa-4x\" ng-class=iconTmp title={{iconTmp}}></i><br> <span ng-bind-html=\"iconTmp| highlight: $select.search\"></span> </ui-select-choices> </ui-select> </div> <div class=\"form-group col-xs-12\"> <label ng-bind=\"translate(\'ADF_EDIT_DASHBOARD_STRUCTURE_LABEL\')\">Structure</label> <div class=row ng-init=\"splitted = split(structures, 3)\"> <div class=col-lg-4 ng-repeat=\"structureColumn in splitted\"> <div class=radio ng-repeat=\"(key, structure) in structureColumn\"> <div class=row> <div class=col-sm-2> <label> <input type=radio value={{key}} ng-model=model.structure ng-change=\"changeStructure(key, structure)\"> </label> </div> <div class=col-sm-9 ng-click=\"changeStructure(key, structure)\"> <adf-structure-preview name=key structure=structure selected=\"model.structure == key\"> </adf-structure-preview> </div> </div> </div> </div> </div> </div> </form> </div> <div class=modal-footer> <div class=col-xs-12> <button type=submit class=\"btn btn-primary\" ng-click=closeDialog() ng-disabled=form.$invalid ng-bind=\"translate(\'ADF_COMMON_CLOSE\')\">Close</button> </div> </div>");
$templateCache.put("../src/templates/dashboard-row.html","<div class=row ng-class=row.styleClass ng-style=row.style>  </div> ");
$templateCache.put("../src/templates/dashboard-title.html","<div class=row style=padding:0px;> <div class=col-xs-12 ng-class=\"hideButtons?\'col-md-12\':\'col-md-5\'\"> <span ng-if=model.icon id=idDashboardIcon class=\"fa fa-2x\" ng-class=model.icon></span> <span id=idDashboardTitle class=\"fa-2x text-primary\">{{model.title}}</span> <span ng-if=model.description id=idDashboardDescription>{{model.description}}</span> </div> <div class=\"col-xs-12 col-md-7 text-right\" ng-if=!hideButtons> <a href ng-if=editMode title=\"{{ translate(\'ADF_DASHBOARD_TITLE_TOOLTIP_ADD\') }}\" ng-click=addWidgetDialog() class=\"btn btn-sm pointer no-transition\"> <i class=\"fa fa-plus\" aria-hidden=true></i> Add widget </a> <a href ng-if=editMode title=\"{{ translate(\'ADF_COMMON_EDIT_DASHBOARD\') }}\" ng-click=editDashboardDialog() class=\"btn btn-sm pointer no-transition\"> <i class=\"fa fa-cog\"></i> Configuration </a> <a href ng-if=editMode title=\"{{ translate(\'ADF_DASHBOARD_TITLE_TOOLTIP_UNDO\') }}\" ng-click=cancelEditMode() class=\"btn btn-warning btn-sm pointer no-transition\"> <i class=\"fa fa-close\"></i> Cancel </a> <a href ng-if=\"options.editable && !editMode && !model.temporal\" title=\"{{translate(\'ADF_DASHBOARD_TITLE_TOOLTIP_EDIT_MODE\') }}\" ng-click=toggleEditMode() class=\"btn btn-sm pointer no-transition\"> <i class=\"fa fa-pencil-square-o\"></i> Edit </a> <a href ng-if=\"options.editable && editMode\" title=\"{{translate(\'ADF_DASHBOARD_TITLE_TOOLTIP_SAVE\')}}\" ng-click=toggleEditMode() class=\"btn btn-success btn-sm pointer no-transition\"> <i class=\"fa fa-save\"></i> Save/Update </a> </div> </div>");
$templateCache.put("../src/templates/dashboard.html","<div class=dashboard-container> <div ng-include src=model.titleTemplateUrl></div> <div class=\"row col-xs-12 dashboard\" x-ng-class=\"{\'edit\' : editMode}\" style=\"padding: 0px;margin: 0px;\"> <adf-dashboard-row row=row adf-model=model options=options ng-repeat=\"row in model.rows\" edit-mode=editMode continuous-edit-mode=continuousEditMode> </adf-dashboard-row></div> </div>");
$templateCache.put("../src/templates/structure-preview.html","<div class=structure-preview ng-class=\"{selected: selected}\"> <h4>{{name}}</h4> <adf-dashboard-row ng-repeat=\"row in preview.rows\" row=row> </adf-dashboard-row></div> ");
$templateCache.put("../src/templates/widget-add.html","<div class=modal-header> <button type=button class=close ng-click=closeDialog() aria-hidden=true>&times;</button> <h4 class=modal-title ng-bind=\"translate(\'ADF_WIDGET_ADD_HEADER\')\">Add new widget</h4> </div> <div class=modal-body>  <div ng-if=createCategories> <uib-accordion ng-init=\"categorized = createCategories(widgets)\"> <div uib-accordion-group heading={{category.name}} ng-repeat=\"category in categorized | adfOrderByObjectKey: \'name\'\"> <dl class=dl-horizontal> <dt ng-repeat-start=\"widget in category.widgets | adfOrderByObjectKey: \'key\'\"> <a href ng-click=addWidget(widget.key) ng-class={{widget.key}}> {{widget.title}} </a> </dt> <dd ng-repeat-end ng-if=widget.description> {{widget.description}} </dd> </dl> </div> </uib-accordion> </div>  <div style=\"display: inline-block;\" ng-if=!createCategories> <dl class=dl-horizontal> <dt ng-repeat-start=\"widget in widgets | adfOrderByObjectKey: \'key\'\"> <a href ng-click=addWidget(widget.key) ng-class={{widget.key}}> {{widget.title}} </a> </dt> <dd ng-repeat-end ng-if=widget.description> {{widget.description}} </dd> </dl> </div> </div> <div class=modal-footer> <button type=button class=\"btn btn-primary\" ng-click=closeDialog() ng-bind=\"translate(\'ADF_COMMON_CLOSE\')\">Close</button> </div> ");
$templateCache.put("../src/templates/widget-delete.html","<div class=modal-header> <h4 class=modal-title><span ng-bind=\"translate(\'ADF_COMMON_DELETE\')\">Delete</span> {{widget.title}}</h4> </div> <div class=modal-body> <form role=form> <div class=form-group> <label for=widgetTitle ng-bind=\"translate(\'ADF_WIDGET_DELETE_CONFIRM_MESSAGE\')\">Are you sure you want to delete this widget ?</label> </div> </form> </div> <div class=modal-footer> <button type=button class=\"btn btn-default\" ng-click=closeDialog() ng-bind=\"translate(\'ADF_COMMON_CLOSE\')\">Close</button> <button type=button class=\"btn btn-primary\" ng-click=deleteDialog() ng-bind=\"translate(\'ADF_COMMON_DELETE\')\">Delete</button> </div> ");
$templateCache.put("../src/templates/widget-edit.html","<form name=widgetEditForm novalidate role=form ng-submit=saveDialog()> <div class=modal-header> <button type=button class=close ng-click=closeDialog() aria-hidden=true>&times;</button> <h3 class=modal-title>{{widget.title}}</h3> </div> <div class=modal-body> <div class=row> <div class=col-xs-12> <div class=\"alert alert-danger\" role=alert ng-show=validationError> <strong>Apply error:</strong> {{validationError}} </div> </div> </div> <div class=row ng-if=widget.show_reload_config> <div class=\"col-xs-12 col-md-6\"> <div class=form-group> <label for=widgetTitle ng-bind=\"translate(\'ADF_COMMON_TITLE\')\">Title</label> <input type=text class=\"form-control text-primary\" id=widgetTitle ng-model=definition.title placeholder=\"Enter title\"> </div> </div> <div class=\"col-xs-12 col-md-6\"> <div class=form-group> <label for=widgetReloadPeriod ng-bind=\"translate(\'ADF_WIDGET_TOOLTIP_REFRESH\')\">Refresh</label> <select class=form-control id=widgetReloadPeriod aria-label=\"ngSelected demo\" ng-model=definition.config.reloadPeriod required> <option ng-selected=selected value=0>MANUAL</option> <option value=20>20 SECONDS</option> <option value=40>40 SECONDS</option> <option value=60>EVERY MINUTE</option> </select> </div> </div> </div> <div class=row ng-if=!widget.show_reload_config> <div class=\"col-xs-12 col-md-12\"> <div class=form-group> <label for=widgetTitle ng-bind=\"translate(\'ADF_COMMON_TITLE\')\">Title</label> <input type=text class=\"form-control text-primary\" id=widgetTitle ng-model=definition.title placeholder=\"Enter title\"> </div> </div> </div> <div ng-if=widget.edit class=row> <div class=col-xs-12> <adf-widget-content model=definition content=widget.edit> </adf-widget-content></div> </div> <div class=row> <div class=col-xs-12> <div class=form-group> <label for=widgetAbout>About</label> <textarea class=\"form-control text-primary\" id=widgetAbout ng-model=definition.config.about placeholder=\"Enter widget description\"></textarea> </div> </div> </div> </div> <div class=modal-footer> <button type=button class=\"btn btn-default\" ng-click=closeDialog() ng-bind=\"translate(\'ADF_COMMON_CANCEL\')\">Cancel</button> <button type=submit class=\"btn btn-primary\" ng-disabled=widgetEditForm.$invalid ng-value=\"translate(\'ADF_COMMON_APPLY\')\">Apply</button> </div> </form>");
$templateCache.put("../src/templates/widget-fullscreen.html","<div class=modal-header> <div class=\"pull-right widget-icons\"> <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_REFRESH\') }}\" ng-if=widget.reload ng-click=reload()> <i class=\"glyphicon glyphicon-refresh\"></i> </a> <a href title=close ng-click=closeDialog()> <i class=\"glyphicon glyphicon-remove\"></i> </a> <a href title=\"insert into dashboard\" ng-if=persistDashboard ng-click=persistDashboard()> <i class=\"glyphicon glyphicon-save\"></i> </a> </div> <h4 class=modal-title>&nbsp;{{ definition.title }}</h4> </div> <div class=\"modal-body widget\" style=overflow:hidden;> <adf-widget-content model=definition content=widget> </adf-widget-content></div> <div class=modal-footer ng-if=widget.show_modal_footer> <button type=button class=\"btn btn-primary\" ng-click=closeDialog() ng-bind=\"translate(\'ADF_COMMON_CLOSE\')\">Close</button> </div>");
$templateCache.put("../src/templates/widget-selection.html","<style>\n    .selected-entities-control .ui-select-container>div:first-child {\n        max-height: 300px;\n        overflow-y: scroll;\n        overflow-x: hidden;\n    }\n</style> <form name=widgetSelectionForm novalidate role=form ng-submit=saveChangesDialog()> <div class=modal-header> <div class=\"col-xs-12 col-md-12\"> <h3 class=\"modal-title text-left\"><i class=\"fa fa-check-square-o\" aria-hidden=true></i> Selected items...</h3> </div> </div> <div class=modal-body> <div class=\"col-xs-12 col-md-6 text-left\"> <button type=button class=\"btn btn-success btn-sm\" ng-click=restoreSelection() ng-disabled=\"currentSelection.selected.length === selectedItemsLength\" ng-bind=\"translate(\'ADF_WIDGET_RESTORE\')\">Restore</button> <button type=button class=\"btn btn-danger btn-sm\" ng-click=clearSelection() ng-disabled=\"currentSelection.selected.length < 1\" ng-bind=\"translate(\'ADF_WIDGET_CLEAR\')\">Clear</button> </div> <div class=\"col-xs-12 col-md-6 text-right\"> <a ng-click=applyFilter() class=\"btn btn-primary btn-sm\" ng-if=filterOnSelection ng-disabled=\"currentSelection.selected.length < 1\" title=\"{{translate(\'ADF_WIDGET_FILTER\')}}\"> <i class=\"glyphicon glyphicon-filter pointer\"></i> </a> <a ng-click=executeOperation() class=\"btn btn-primary btn-sm\" ng-if=\"currentSelection.selected.length> 0\" ng-disabled=\"currentSelection.selected.length < 1\" title=\"{{translate(\'ADF_WIDGET_TOOLTIP_OPERATION\')}}\"> <i class=\"glyphicon glyphicon-flash pointer\"></i> </a> </div> <div class=col-xs-12> <div class=\"form-group selected-entities-control\"> <label for=currentSelection>Current selection</label> <ui-select multiple tagging ng-model=currentSelection.selected theme=bootstrap sortable=false title=\"Selected items\"> <ui-select-match placeholder=\"No items selected\">{{$item.key}}</ui-select-match> <ui-select-choices repeat=\"itemSel in currentSelection.selected | filter:$select.search\"> {{itemSel.key}} </ui-select-choices> </ui-select> </div> </div> </div> <div class=modal-footer> <button type=button class=\"btn btn-default\" ng-click=closeDialog() ng-bind=\"translate(\'ADF_COMMON_CANCEL\')\">Cancel</button> <button type=submit class=\"btn btn-primary\" ng-disabled=widgetSelectionForm.$invalid ng-value=\"translate(\'ADF_COMMON_APPLY\')\">Apply</button> </div> </form>");
$templateCache.put("../src/templates/widget-title.html","<div class=panel-title style=margin:0px;> <span class=pull-left> <h4 ng-if=\"!widget.frameless && definition.title\" style=margin:0px;>{{definition.title}}</h4> </span> <div class=pull-right> <span ng-if=config.about> <a href uib-popover=\"{{ config.about }}\" popover-trigger=\"\'mouseenter\'\" popover-placement=top ng-click=openAboutScreen()> <i class=\"glyphicon glyphicon-info-sign\"></i></a> <script type=text/ng-template id=widgetAboutModal.html> <div class=\"modal-header\"> <h4 class=\"modal-title\">About</h4> </div> <div class=\"modal-body\">{{ about.info }}</div> <div class=\"modal-footer\"><button class=\"btn btn-primary\" type=\"button\" ng-click=\"ok()\">OK</button></div> </script> </span> <a ng-if=\"!editMode && widget.print\" href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_PRINT\') }}\" ng-click=print()> <i class=\"glyphicon glyphicon-print\"></i> </a> <span ng-if=\"!editMode && config.widgetOnToggleView && config.widgetViews\" uib-popover=\"Change view\" popover-trigger=\"\'mouseenter\'\" popover-placement=top uib-dropdown> <a href id=toggle_{{definition.wid}} uib-dropdown-toggle> <i class=\"glyphicon glyphicon-eye-close\"></i> </a> <ul class=dropdown-menu uib-dropdown-menu aria-labelledby=\"Change view\"> <li ng-repeat=\"choice in config.widgetViews\"> <a ng-click=config.widgetOnToggleView(choice.value)>{{choice.name}}</a> </li> </ul> </span> <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_REFRESH\') }}\" ng-if=widget.reload ng-click=reload()> <i class=\"glyphicon glyphicon-refresh\"></i> </a>  <a href ng-if=\"selectedItemsLength > 0\" title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_SELECTION\') }}\" ng-click=manageSelectedItems()> <i class=\"glyphicon glyphicon-check\"></i><small class=ogux-budget>{{ selectedItemsLength }}</small> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_OPERATION\') }}\" ng-if=\"widget.executeOperation && !editMode && isExecuteOperationEnabled()\" ng-click=executeOperation()> <i class=\"glyphicon glyphicon-flash\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_FILTER\') }}\" ng-if=\"config.widgetSelectors && !editMode\" ng-click=showFilter()> <i class=\"glyphicon glyphicon-filter\" ng-class=\"{\'active\': search.json || search.quick ||search.customFilter}\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_SORT\') }}\" ng-if=\"config.sort && !editMode\" ng-click=showFilter()> <i class=\"glyphicon glyphicon-sort\" ng-class=\"{\'active\': (config.sort.value && config.sort.value !== \'\')}\"></i> </a>  <a href title=\"Save picture\" ng-if=\"!editMode && !widgetState.isCollapsed\" ng-click=saveWidgetScreen(definition.wid)> <i class=\"glyphicon glyphicon-picture\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_MOVE\') }}\" class=adf-move ng-if=editMode> <i class=\"glyphicon glyphicon-move\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_COLLAPSE\') }}\" ng-show=\"options.collapsible && !widgetState.isCollapsed\" ng-click=\"widgetState.isCollapsed = !widgetState.isCollapsed\"> <i class=\"glyphicon glyphicon-minus\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_EXPAND\') }}\" ng-show=\"options.collapsible && widgetState.isCollapsed\" ng-click=\"widgetState.isCollapsed = !widgetState.isCollapsed\"> <i class=\"glyphicon glyphicon-plus\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_EDIT\') }}\" ng-click=edit() ng-if=editMode> <i class=\"glyphicon glyphicon-cog\"></i> </a> <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_FULLSCREEN\') }}\" ng-click=openFullScreen() ng-show=options.maximizable> <i class=\"glyphicon glyphicon-fullscreen\"></i> </a>  <a href title=\"{{ translate(\'ADF_WIDGET_TOOLTIP_REMOVE\') }}\" ng-click=remove() ng-if=editMode> <i class=\"glyphicon glyphicon-trash\"></i> </a> </div> </div>");
$templateCache.put("../src/templates/widget.html","<div adf-id={{definition.wid}} adf-widget-type={{definition.type}} ng-class=\"widgetClasses(widget, definition)\" class=\"widget widget_{{definition.wid}}\"> <a name={{definition.wid}} id={{definition.wid}}></a> <div class=\"panel-heading clearfix bg-primary\" ng-if=\"!widget.frameless || editMode\"> <div ng-include src=definition.titleTemplateUrl></div> </div> <div ng-if=\"!widgetState.isCollapsed && config.widgetSelectors && !editMode && filterAvailable\" class=\"row form-group\" style=\"margin-top: 5px !important;\"> <div ng-if=\"toggleAdvanced === 0\" class=\"col-xs-12 col-md-8\"> <div class=filter mass-autocomplete> <input class=form-control style=padding-right:15px; name=filterValue ng-keypress=enter($event) ng-model=search.oql placeholder=\"Enter your advanced filter\" mass-autocomplete-item=autocomplete_options() ng-change=debugQuery()> <label ng-click=launchSearchingAdv() style=\"position: absolute;font-size: 1.5em;cursor:pointer;right: 15px;\" class=\"glyphicon glyphicon-search\"></label> </div> <div ng-if=\"!editMode && filter.error\" class=col-xs-12> <alert type=danger class=\"text-center text-danger\"> <span>{{filter.error}}</span> </alert> </div> <div ng-if=\"showFinalFilter && search.json\" class=col-xs-12> <pre>{{ search.json }}</pre> </div> </div> <div ng-if=ifCustomFilter() class=\"col-xs-12 col-md-8\"> <div class=\"filter form-group\"> <a href class=text-danger ng-click=\"options.customFilter.open = !options.customFilter.open\"> <i class=glyphicon ng-class=\"{\'glyphicon-chevron-up\': options.customFilter.open, \'glyphicon-chevron-down\': !options.customFilter.open}\"></i> Pick filter fields </a> <label ng-click=launchCustomFilter() style=\"position: absolute;font-size: 1.5em;cursor:pointer;right: 15px;\" class=\"glyphicon glyphicon-search\"></label> <div class=row ng-if=options.customFilter.open> <ui-select multiple=true ng-model=search.fields theme=bootstrap title=\"Choose a filter\" on-select=addCustomFilter($item) on-remove=deleteFilter($item) ng-click=getcustomFilter()> <ui-select-match placeholder=\"Pick filter fields ...\" allow-clear=true> {{$item}} </ui-select-match> <ui-select-choices repeat=\"selector in (customFilter | filter: $select.search) track by $index\"> <small ng-bind-html=\"selector | highlight: $select.search\"></small> </ui-select-choices> </ui-select> </div> </div> </div> <div ng-if=\"toggleAdvanced === 1\" class=\"col-xs-12 col-md-8\"> <div class=filter> <input class=form-control style=padding-right:15px; name=filterValue ng-keypress=enter($event) ng-model=search.quick placeholder=\"Enter your basic filter here\"> <label ng-click=launchSearchingQuick() style=\"position: absolute;font-size: 1.5em;cursor:pointer;right: 15px;\" class=\"glyphicon glyphicon-search\"></label> </div> </div> <div class=\"col-xs-12 col-md-4\" uib-dropdown> <button class=\"btn btn-sm\" uib-dropdown-toggle title=\"Toggle Advanced/Basic filter\"> <i class=\"advanced-filter glyphicon\" ng-class=\"{\'glyphicon-font\' : toggleAdvanced === 0, \'glyphicon-bold\' : toggleAdvanced ===1 , \'glyphicon-filter\' : toggleAdvanced === 2, }\"></i> <span class=caret></span> </button> <ul class=\"dropdown-menu panel\" style=\"border: 1px groove;\" uib-dropdown-menu aria-labelledby=simple-dropdown> <li ng-click=toggleFilter(0)><a href><i class=\"advanced-filter glyphicon glyphicon-font txt-primary\"></i> Advanced filter</a></li> <li ng-click=toggleFilter(1)><a href><i class=\"basic-filter glyphicon glyphicon-bold txt-primary\"></i> Basic filter</a></li> <li ng-if=\"definition.type === \'FullDevicesList\'\" ng-click=toggleFilter(2)><a href><i class=\"custom-filter glyphicon glyphicon-filter txt-primary\"></i> Custom filter</a></li> </ul> </div> </div> <div ng-if=\"customSelectors && config.sort && filterAvailable && toggleAdvanced != 2\" class=\"row form-group\" style=\"margin-top: 5px !important;\"> <div class=\"sort col-xs-12 col-md-8\"> <ui-select ng-model=config.sort.value theme=bootstrap title=\"Choose a filter\" allow-clear=true append-to-body=true ng-change=launchSearching() ng-click=getCustomSelectors()> <ui-select-match placeholder=\"Sorted by ...\" allow-clear=true>Sort by: {{$select.selected}}</ui-select-match> <ui-select-choices repeat=\"selector in customSelectors | filter: $select.search\"> <small ng-bind-html=\"selector | highlight: $select.search\"></small> </ui-select-choices> </ui-select> </div> <div class=\"sortDirection col-xs-4 col-md-4\"> <button class=\"btn btn-sm pointer\" ng-click=changeDirection() ng-disabled=\"config.sort.value === \'\'\" title=\"Toggle sorting direction\"> <i class=glyphicon style=font-size:1.3em; ng-class=\"config.sort.direction===\'ASCENDING\' ? \'glyphicon-sort-by-attributes\': \'glyphicon-sort-by-attributes-alt\'\"></i> </button> </div> </div> <div ng-if=showCustomFields() class=\"col-xs-12 col-md-12\"> <div class=\"col-xs-12 col-md-4\" ng-repeat=\"model in search.customFilter\"> <label>{{model.name}}</label> <input class=form-control id={{model.name}} name={{model.name}} type=text ng-model=search.customFilter[$index].value ng-keypress=enter($event)> </div> </div> <div ng-class=\"{ \'panel-body\':!widget.frameless || editMode}\" uib-collapse=widgetState.isCollapsed style=overflow:hidden;> <adf-widget-content model=definition content=widget editing=editMode> </adf-widget-content></div> </div>");}]);
})(window);