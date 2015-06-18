Ext.define('customdragdrop', {
    extend : 'Ext.tree.plugin.TreeViewDragDrop',
    alias : 'plugin.customdragdrop',

    requires: [
        'Rally.data.Ranker',
        'Rally.ui.grid.dragdrop.TreeDragZone',
        'Rally.ui.grid.dragdrop.TreeDropZone',
        'Rally.ui.notify.Notifier'
    ],

    config: {
        /**
         * @cfg {String} rankEnabledCls (required)
         * The css class to put on the view to signify rows are draggable.
         */
        rankEnabledCls: 'rank-enabled'
    },

    clientMetrics: [
        {
            beginMethod: '_onInitDrag',
            endEvent: 'drop',
            description: 'treegrid drag and drop'
        }
    ],

    init: function(view) {
        this.view = view;
        this.view.mon(this.view, 'storeload', this._onStoreLoad, this);
        this.view.mon(this.view, 'drop', this._onDrop, this);
        this.callParent(arguments);
    },

    enable: function() {
        this._showRankColumn();
        this.callParent(arguments);
    },

    disable: function() {
        this._hideRankColumn();
        this.callParent(arguments);
    },

    onViewRender: function() {
        this._enableDragDrop();
    },

    _enableDragDrop: function() {
        var rankColumn = this._getRankColumn(),
            ranker = Rally.data.Ranker,
            treeStore = this.view.getTreeStore();

        if(rankColumn) {
            this.dragTracker = Ext.create('Ext.dd.DragTracker', {
                el: this.view.getEl(),
                delegate: '.' + Ext.baseCSSPrefix + 'grid-data-row',
                autoStart: true,
                captureEvent: false,
                preventDefault: false,
                listeners: {
                    mousedown: function(tracker, e) {
                        this.activeButton = e.button;
                    },
                    dragstart: function (tracker, e) {
                        if(!ranker.isDnDRankable(treeStore) && this.activeButton === 0){
                            Rally.ui.notify.Notifier.showWarning({
                                message: 'Items cannot be reordered unless sorted by rank ascending.',
                                duration: 10000
                            });
                            delete this.activeButton;
                            this.endDrag(e);
                        }
                    }
                }
            });

            this.dragZone = Ext.create('Rally.ui.grid.dragdrop.TreeDragZone', {
                view: this.view,
                ddGroup: 'hr',
                dragText: this.dragText,
                rankEnabledCls: this.rankEnabledCls,
                draggableCls: this._getRankColumn().draggableCls,
                containerScroll: {
                    vthresh: 30,
                    hthresh: -1,
                    frequency: 350,
                    increment: 50
                },
                scrollEl: this.view.getEl(),
                listeners: {
                    initdrag: this._onInitDrag,
                    scope: this
                }
            });

            this.dropZone = Ext.create('Rally.ui.grid.dragdrop.TreeDropZone', {
                view: this.view,
                ddGroup: 'hr',
                handleNodeDrop: function() {},
            });
        }
    },

    _getRankColumn: function() {
        var rankCol = this.view.headerCt.items.getAt(0);
        return rankCol;
    },

    _showRankColumn: function() {
        if (!this.view.hasCls(this.rankEnabledCls)) {
            this.view.addCls(this.rankEnabledCls);
        }
    },

    _hideRankColumn: function() {
        this.view.removeCls(this.rankEnabledCls);
    },

    _onInitDrag: function() {
        if (this.dropZone) {
            this.dropZone.clearRowNodePositions();
        }
    },

    _onStoreLoad: function() {
        if (Rally.data.Ranker.isDnDRankable(this.view.getTreeStore())) {
            this.enable();
        } else {
            this.disable();
        }
    },

    _onDrop: function(rowEl, dropData, overModel, dropPosition, opts) {
        var droppedRecord = dropData.records[0];
        droppedRecord._dragAndDropped = true;

        this.view.ownerCt.setLoading(true);

        droppedRecord.set('Parent', overModel.get('_ref'));

        droppedRecord.save({
          callback: function(record, operation) {
            delete record._dragAndDropped;
            this.view.ownerCt.setLoading(false);
          },
          scope: this           
        });

    },

    destroy: function() {
        Ext.destroy(this.dragTracker, this.dragZone, this.dropZone);
    }
});