(function() {
  Ext.define('ChildUserStoriesPopover', {
    alias: 'childuserstoriespopover',
    extend: 'Rally.ui.dialog.Dialog',
    clientMetrics: [
      {
        event: 'show',
        description: 'popover opened'
      }
    ],

    mixins: {
      clientMetrics: 'Rally.clientmetrics.ClientMetricsRecordable'
    },

    id: 'grid-popover',
    cls: 'grid-popover',
    title: 'Reparent Child Stories...',
    titleIconCls: 'icon-story',

    width: 750,
    maxHeight: 600,

    layout: 'autocontainer',
    autoShow: true,
    closable: true,
    closeAction: 'destroy',

    constructor: function(config, record) {
      this.selectedItemsDictionary = {};
      this.record = record;
      this.title = "Reparent Child Stories for " + record.get("FormattedID") + ": " + record.get("Name");  
      
      this.childrenGrid = Ext.merge(
          {
            xtype: 'rallygrid',
            itemId: 'listview',
            enableBulkEdit: true,
            record: config.record,
              storeConfig: {
                listeners: {
                  load: {
                    fn: this._onStoreLoad,
                    scope: this,
                    options: {
                      single: true
                    }
                  }
                },
                filters: [{
                  property: 'Parent.ObjectID',
                  operator: '=',
                  value: record.get("ObjectID")
                }],
                fetch: [ 'FormattedID', 'Name', 'ScheduleState']
              },
              columnCfgs: [
              {
                dataIndex: 'FormattedID',
                width: 90
              },
              {
                dataIndex: 'Name',
                flex: 1
              },
              {
                dataIndex: 'ScheduleState',
                width: 180
              }
            ], 
            listeners: {
                select: this._onChildSelect,
                deselect: this._onChildDeselect,
                scope: this
            }  
          },{
            model: Ext.identityFn('HierarchicalRequirement'),
            parentProperty: 'Parent',
            childField: 'Children',
            addNewConfig: null,
            gridConfig: {
              storeConfig: {
                context: config.context,
                model: record,
                listeners: {
                  load: this._onStoreLoad,
                  scope: this
                }
              }
            }
        }, 
        config.listViewConfig
      );
      
      this.newParent = Ext.create('Rally.ui.combobox.ArtifactSearchComboBox', {
        emptyText: 'New Parent',
        allowNoEntry: false,
        storeConfig: {
            models: ['userstory']
        },
        listeners: {
          select: this._onParentSelected,
          scope: this
        }
      });
      
      this.moveButton = Ext.create('Rally.ui.Button', {
        text: 'Move stories',
        disabled: true,
        handler: Ext.bind(this._moveStories, this)
      });
      
      var layoutContainer = Ext.create('Ext.container.Container', {
        layout: {
          type: 'hbox',
          align: 'stretch'
        },
        padding: '5 5 5 5',
        items: [ 
          {
              xtype: 'panel',
              title: 'Select Children',
              header: {
                border: '0 1 0 0',
                style: {
                  borderColor: '#d6d6d6',
                  borderStyle: 'solid'
                },
                cls: 'dialogHeader'
              },
              flex: 2,
              bodyPadding: 5,
              items: [
                this.childrenGrid
              ]
          },        
          {
              xtype: 'panel',
              title: 'Select Parent',
              header: {
                border: '0 0 0 1',
                style: {
                  borderColor: '#d6d6d6',
                  borderStyle: 'solid'
                },
                cls: 'dialogHeader'
              },
              flex: 1,
              bodyPadding: 5,
              items: [
                this.newParent,
                this.moveButton
              ]
          }
        ]
      });
      
      config.items = [layoutContainer];
      this.record = config.record;

      this.callParent(arguments);
    },
    
    _onParentSelected: function( combo, records, eOpts ) {
      this.moveButton.enable();
    },
          
    _onChildSelect: function(rowModel, record, rowIndex, options) {
      var id = record.get('ObjectID');
      this.selectedItemsDictionary[id] = record;
    },
    
    _onChildDeselect: function(rowModel, record, rowIndex, options) {
      var id = record.get('ObjectID');
      delete this.selectedItemsDictionary[id];
    },
    
    _moveStories: function() {
      var parent = this.newParent.getRecord();
      
      if(!parent) {
        Ext.Msg.alert('The EPIC Split', 'You must select a new parent.');
        return;
      }
      
      for (var key in this.selectedItemsDictionary) {
        if (this.selectedItemsDictionary.hasOwnProperty(key)) {          
          var record = this.selectedItemsDictionary[key];          
          record.set('Parent', parent.get("_ref"));          
          record.save({
            callback: this._recordSaveCallback,
            scope: this           
          });
        }
      }
      
      this.close();
    },

    _recordSaveCallback: function(record, operation) {
      _.each(this.idsToRefresh, function(id) {
        Ext.ComponentQuery.query('#'+id)[0].refresh();
      }, this);
    },

    initComponent: function() {
      this.recordLoadBegin({
        description: 'listview popover created',
        startTime: new Date().getTime()
      });

      this.callParent(arguments);
    },

    getGrid: function() {
      return this.down('#listview').getGrid();
    },

    _onStoreLoad: function() {
      if (Rally.BrowserTest) {
        Rally.BrowserTest.publishComponentReady(this);
      }
      this.recordLoadEnd({
        stopTime: new Date().getTime()
      });
    }
  });
})();