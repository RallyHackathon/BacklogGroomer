Ext.define('DragDropTree', {
  extend: 'Rally.ui.tree.Tree',
  requires: ['Rally.ui.tree.UserStoryTreeItem'],

  getTreeItemConfigForRecordFn: function(){
    return function(){
      xtype: 'rallyuserstorytreeitem'
    };
  },

  makeTreeItemDraggable: function(treeItem){
    var tree = this;

    if(treeItem.getCanDrag()){
      var me = this;
      var dragSource = Ext.create('Ext.dd.DragSource', treeItem.getEl(), {
        treeItem: treeItem,
        getDragData: function() {
          var record = treeItem.getRecord();
          return {
            item: record,
            records: [record]
          };
        },
        ddGroup: 'hr',
        isTarget: false,
        proxy: Ext.create('Ext.dd.StatusProxy', {
          animRepair: true,
          shadow: false,
          dropNotAllowed: 'rallytree-proxy'
        }),
        beforeDragDrop: function(){
          me.fireEvent('drag', treeItem);
          return true;
        },
        afterDragDrop: function(){
          me.fireEvent('drop', treeItem);
        }
      });

      dragSource.setHandleElId(treeItem.getEl().down('.drag').id);
    }

    if(treeItem.getCanDropOnMe()){
      var dropTarget = Ext.create('Rally.ui.tree.TreeItemDropTarget', treeItem.down('#treeItemContent').getEl(), {
        tree: tree,
        treeItem: treeItem
      });

      if(treeItem.dropTarget){
        treeItem.dropTarget.unreg();
      }

      treeItem.dropTarget = dropTarget;

      var dropTargetGroups = this.getDragThisGroupOnMeFn().call(this.getScope(), treeItem.getRecord());
      if(!Ext.isArray(dropTargetGroups)){
        dropTargetGroups = [dropTargetGroups];
      }
      Ext.each(dropTargetGroups, function(dropTargetGroup){
        dropTarget.addToGroup(dropTargetGroup);
      });
    }

  },
  
  treeItemConfigForRecordFn: function(record){
    return {
        xtype: 'rallyuserstorytreeitem'
    };
  }
});

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'hbox',
        align: 'stretch'
    },

    launch: function() {
      this.leftContainer = Ext.create('Ext.Container', {
        flex: 1,
        align: 'stretch'
      });
      
      this.rightContainer = Ext.create('Ext.Container', {
        id: 'rightcontainer',
        flex: 2,
        align: 'stretch'
      });
      
      this.add([this.leftContainer, this.rightContainer]);
          
      this.buildOrphanedStoryTree();
      
      Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
        models: ['userstory'],
        autoLoad: true,
        enableHierarchy: true
      }).then({
        success: this._onStoreBuilt,
        scope: this
      });
      
    },

    buildOrphanedStoryTree: function() {
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

        var childrenFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'DirectChildrenCount',
            value: '0',
            operator: '='
        });
                
        var filter = parentFilter.and(childrenFilter.and(piFilter));
        
        var orphanStoryTree = Ext.create('DragDropTree', {
            enableDragAndDrop: true,            
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
        
        this.leftContainer.add(orphanStoryTree);
    },
    
    _onStoreBuilt: function(store) {
      this.rightContainer.add({
        xtype: 'rallytreegrid',
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
                  text: 'Split Child Stories...', 
                  record: record, 
                  handler: function(){ 
                    Ext.create('childuserstoriespopover', {
                        field: 'UserStory',
                        record: record,
                        target: 'rightcontainer'
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
              'customdragdrop',
              'rallyviewvisibilitylistener'
          ]
        },
        padding: '5'
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
        ],
        padding: '5'
      });
    }
});
