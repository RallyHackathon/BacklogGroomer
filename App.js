Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    requires: ['Rally.ui.tree.UserStoryTreeItem'],
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
        html: '<h3 style="margin-left:10px">Select a story from the left menu and drag it to the right to assign a new parent.</h3>',
        xtype: "panel"
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
      
      return _.contains(subModules, 'Rally Product Manager') || _.contains(subModules, 'Rally Portfolio Manager') ? 
        parentFilter.and(piFilter) : 
        parentFilter;
    },

    _buildStoryTree: function(expandNode) {
      Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
        models: ['userstory'],
        autoLoad: true,
        enableHierarchy: true,        
        filters: this._getParentFilters()
      }).then({
        success: function(store) {
          this._onStoreBuilt(expandNode, store);
        },
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
                fetch: ['FormattedID', 'Name', 'ObjectID', 'DirectChildrenCount', 'ScheduleState', 'Parent'],
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
            },
            treeItemConfigForRecordFn: function() {
              return {xtype: 'rallyuserstorytreeitem'};
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
          },
          treeItemConfigForRecordFn: function() {
            return {xtype: 'rallyuserstorytreeitem'};
          }            
      });
      
      this.unparentedStoryTree = this.down('#unparentedStories').add(unparentedStoryTree);
    },
    
    _onStoreBuilt: function(expandNode, store) {
      var _buildStoryTree = this._buildStoryTree.bind(this);

      var storyTree = this.down('#storygrid').add({
        xtype: 'rallytreegrid',
        id: 'storyTree',
        store: store,
        enableBulkEdit: false,
        context: this.getContext(),
        columnCfgs: [
          'Name',
          'ScheduleState',
          'Owner'
        ],
        enableRanking: false,
        refresh: function(overModel) {
          this.destroy();
          _buildStoryTree(overModel);
        },
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

      if (expandNode) storyTree.expandNode(expandNode);
    }
});
