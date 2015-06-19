Ext.define('MyTreeItem', {
     extend: 'Rally.ui.tree.TreeItem',
     alias: 'widget.mytreeitem',

     //override the function to create a new template for the tree item
     getContentTpl: function(){
         return Ext.create('Ext.XTemplate',
             '{Name} - {ObjectID}'
         );
     }
 });


Ext.define('DragDropTree', {
  extend: 'Rally.ui.tree.Tree',
  requires: ['Rally.ui.tree.UserStoryTreeItem'],

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
        xtype: 'mytreeitem'
    };
  }

});