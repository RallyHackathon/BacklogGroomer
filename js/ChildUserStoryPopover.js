(function() {
  Ext.define('ChildUserStoriesPopover', {
    alias: 'childuserstoriespopover',
    extend: 'Rally.ui.popover.Popover',
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
    title: 'Select stories to move...',
    titleIconCls: 'icon-story',

    width: 750,
    maxHeight: 600,

    layout: 'autocontainer',

    constructor: function(config, record) {
      this.newParent = Ext.create('Rally.ui.combobox.ArtifactSearchComboBox', {
        storeConfig: {
            models: ['userstory']
        }
      });
      
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
            ]
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
      
      var items = [ 
        this.childrenGrid,
        this.newParent,
        {
          xtype: 'rallybutton',
          text: 'Move stories',
          handler: Ext.bind(this._moveStories, this)
        }];

      config.items = Ext.merge(items, config.items);
      this.record = config.record;

      this.callParent(arguments);
    },
    
    _moveStories: function() {
      var parent = this.newParent.getRecord();
      
      Ext.Msg.alert('Button', 'You clicked me');
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