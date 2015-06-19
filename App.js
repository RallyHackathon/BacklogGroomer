Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
      type: 'vbox',
      align: 'stretch'
    },

    launch: function() {      
      var leftPanel = Ext.create('Ext.panel.Panel', {
        id: 'leftcontainer',
        bodyPadding: 5,
        flex: 1,
        layout: 'hbox',
        items: [{
          itemId: 'accContainer',
          layout: 'accordion',
          defaults: {
              bodyPadding: 10
          },
          height: '100%',
          items: [
            {
                title: 'Orphaned Stories',
                itemId: 'orphanStories',
                autoScroll: true
            },
            {
                title: 'Unparented Stories',
                itemId: 'unparentedStories',
                autoScroll: true,
                height: '100%'
            }
          ],
          flex: 1
        }]
      });
      
      var rightPanel = Ext.create('Ext.panel.Panel', {
        id: 'rightcontainer',
        bodyPadding: 5,
        flex: 2,
        align: 'stretch',
        items: [{
          layout: 'accordion',
          defaults: {
              bodyPadding: 10
          },
          height: '100%',
          items: [{
            title: 'All Stories',
            itemId: 'storygrid',
            autoScroll: true
          }]
        }]  
      });
    
      this.add([{
            xtype: 'text',
            text: 'Backlog Groomer'
        },{
          xtype: 'container',
          align: 'stretch',
          layout: {
            type: 'hbox',
            align: 'stretch'
          },
          items: [ 
            leftPanel,
            rightPanel
          ]
      }]);
      
      this._loadGrids();
    },
    
    _loadGrids: function() {
      this._buildOrphanedStoryTree();
      this._buildUnparentedStoryTree();
      this._buildStoryTree();
    },

    _getParentFilters: function() {
      var parentFilter = Ext.create('Rally.data.QueryFilter', {
        property: 'Parent',
        value: 'null',
        operator: '='
      });

      var piFilter = Ext.create('Rally.data.QueryFilter', {
        property: 'PortfolioItem',
        value: 'null',
        operator: '='
      });

      var subModules = Rally.environment.getContext().getSubscription().Modules;
      
      return _.contains(subModules, 'Rally Product Manager') ? parentFilter.and(piFilter) : parentFilter;
    },

    _buildStoryTree: function() {
      Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
        models: ['userstory'],
        autoLoad: true,
        enableHierarchy: true,        
        filters: this._getParentFilters()
      }).then({
        success: this._onStoreBuilt,
        scope: this
      });
    },
    
    _buildOrphanedStoryTree: function() {
        var parentFilter = this._getParentFilters();

        var childrenFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'DirectChildrenCount',
            value: '0',
            operator: '='
        });
                
        var filter = parentFilter.and(childrenFilter);
        
        var orphanStoryTree = Ext.create('DragDropTree', {
            id: 'orphanTree',
            enableDragAndDrop: true,            
            emptyText: 'No oprhan stories',
            dragDropGroupFn: function(record){
                return 'hr';
            },dragThisGroupOnMeFn: function(record){
                return 'hr';
            },
            topLevelStoreConfig: {
                model: 'User Story',
                fetch: ['FormattedID', 'Name', 'ObjectID', 'DirectChildrenCount', 'Parent'],
                filters: filter,
                canDrag: true,
                sorters: [{
                    property: 'Rank',
                    direction: 'asc'
                }],
                listeners: {
                    load: function(store, records, successful, options) {
                        if (store.totalCount > 200) {
                            Rally.ui.notify.Notifier.showError({message: 'There are more than 200 orphaned stories.'});
                        }
                    }
                }
            }            
        });
        
        this.orphanStoryTree = this.down('#orphanStories').add(orphanStoryTree);
    },

    _buildUnparentedStoryTree: function() {
      var filter = this._getParentFilters();
      
      var unparentedStoryTree = Ext.create('DragDropTree', {
          id: 'unparentedTree',
          enableDragAndDrop: true,           
          emptyText: 'No unparented stories',      
          dragDropGroupFn: function(record){
            return 'hr';
          },dragThisGroupOnMeFn: function(record){
            return 'hr';
          },
          topLevelStoreConfig: {
            model: 'User Story',
            fetch: ['FormattedID', 'Name', 'ObjectID', 'DirectChildrenCount', 'Parent'],
            filters: filter,
            canDrag: true,
            sorters: [{
              property: 'Rank',
              direction: 'asc'
            }],
            listeners: {
              load: function(store, records, successful, options) {
                if (store.totalCount > 200) {
                  Rally.ui.notify.Notifier.showError({message: 'There are more than 200 orphaned stories.'});
                }
              }
            }
          }            
      });
      
      this.unparentedStoryTree = this.down('#unparentedStories').add(unparentedStoryTree);
    },
    
    _onStoreBuilt: function(store) {
      this.down('#storygrid').add({
        xtype: 'rallytreegrid',
        id: 'storyTree',
        store: store,
        context: this.getContext(),
        columnCfgs: [
          'Name',
          'ScheduleState',
          'Owner'
        ],
        rowActionColumnConfig: {
          xtype: 'rallyrowactioncolumn',
          rowActionsFn: function (record) {
            return [
              { 
                text: 'Reparent Child Stories...', 
                record: record, 
                handler: function(){ 
                  Ext.create('childuserstoriespopover', {
                    field: 'UserStory',
                    record: record,
                    target: 'leftcontainer',
                    idsToRefresh: ['storyTree', 'orphanTree', 'unparentedTree']
                  }, record);
                }
              }
            ];
          }
        },
        viewConfig: {
          xtype: 'rallytreeview',
          animate: false,
          loadMask: false,
          forceFit: true,
          plugins: [
              {
                ptype: 'customdragdrop',
                idsToRefresh: ['storyTree', 'orphanTree', 'unparentedTree']
              },
              'rallyviewvisibilitylistener'
          ]
        }
      });
    },
    
    _onUnparentedDataLoaded: function(store, data) {
   
      this.leftContainer.add({
        xtype: 'rallygrid',
        showPagingToolbar: false,
        showRowActionsColumn: false,
        enableRanking: true,
        editable: false,
        store: store,
        columnCfgs: [
          {
              xtype: 'templatecolumn',
              text: 'ID',
              dataIndex: 'FormattedID',
              width: 100,
              tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
          },
          {
              text: 'Name',
              dataIndex: 'Name',
              flex: 1
          }
        ]
      });
    }
});
