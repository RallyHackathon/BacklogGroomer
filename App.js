Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
      Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
        models: ['userstory'],
        autoLoad: true,
        enableHierarchy: true
      }).then({
        success: this._onStoreBuilt,
        scope: this
      });
    },
    
    _onStoreBuilt: function(store) {
      this.add({
        xtype: 'rallytreegrid',
        store: store,
        context: this.getContext(),
        // enableInlineAdd: true,
        columnCfgs: [
          'Name',
          'ScheduleState',
          'Owner',
          'PlanEstimate'
        ]
      });
    }
});
