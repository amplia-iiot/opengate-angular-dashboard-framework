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

        function compileWidget($scope, $element, currentScope, configChanged, showFirstPage) {
            var model = $scope.model;
            var content = $scope.content;
            var editing = $scope.editing;

            var newScope = currentScope;
            if (!model) {
                renderError($element, 'model is undefined');
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
                    // if ($scope.selectionManager.totalSelected() > 0)
                    //     return true;
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
                        // if ($scope.selectionManager.totalSelected() > 0) {
                        //     var selectedItems = [];
                        //     angular.forEach($scope.selectionManager.currentSelection, function(data, key) {
                        //         selectedItems.push({ key: key, value: data });
                        //     });
                        //     $scope.$parent.$broadcast('widgetExecuteOperation', { 'selectedItems': selectedItems });
                        // } else {
                        $scope.$parent.$broadcast('widgetExecuteOperation');
                        // }
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

                $scope.reload = function(completeReload) {
                    if (completeReload) {
                        $scope.$broadcast('widgetReload', completeReload);
                    } else {
                        $scope.$broadcast('widgetReload');
                    }

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
                    $scope.reload(true);
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

                    selectionScope.selectionConfig = $scope.config.selectionConfig;

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
                            $scope.$parent.$broadcast('widgetExecuteOperation', { 'selectedItems': selectionScope.currentSelection.selected, 'type': operationType });
                        }
                    };

                    // Cierra sy guarda los datos de nueva selección
                    selectionScope.saveChangesDialog = function() {
                        var finalSelection = {};
                        angular.forEach(selectionScope.currentSelection.selected, function(data, idx) {
                            finalSelection[data.key] = { data: data.value.data, visible: data.value.visible };
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

                $scope.$on('$destroy', function() {
                    adfDashboardCollapseExpand();
                    adfWidgetEnterEditMode();
                    adfIsEditMode();
                    adfDashboardChanged();
                    adfDashboardEditsCancelled();
                    addItemToSelection();
                    removeItemFromSelection();
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
})(window);