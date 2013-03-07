define(["jquery", "backbone", "viewMixins", "marionette", "cssUtils", "jquery.fastbutton", "backboneExtensions", "marionetteExtensions", "jquery.imagesloaded", "iscroll"], function($, Backbone, ViewMixins, Marionette, CssUtils) {


    var transitionendEvent = CssUtils.getTransitionendEvent();

    ///////////////////////   Modules   ///////////////////////

    var ExpandableModule = {
        expanded : false,
        events : {
            fastclick : "onClick"
        },
        onClick : function() {

            // Decide whether to expand or collapse
            this.expanded ? this.collapse() : this.expand();
        },
        expand : function() {
            this.expanded = true;
            this.$el.addClass("expanded");
            this.triggerMethod("expand");
        },
        collapse : function() {
            this.expanded = false;
            this.$el.removeClass("expanded");
            this.triggerMethod("collapse");
        }
    };



    ///////////////////////   Views   ///////////////////////

    var BaseView = Marionette.ItemView;


    // TODO: Separate into several views that are template specific
    var ModalDialog = BaseView.extend({
        className : "modal-container",
        initialize : function() {
            _.bindAll(this, "close");
        },
        triggers : {
            "fastclick .close"    : "cancel",
            "fastclick .modal"    : "cancel",
            "fastclick .buy-more" : "buyMore",
            "fastclick .cancel"   : "cancel"
        },
        onRender : function() {
            this.options.parent.append(this.$el);
        },
        // The modal dialog model is a simple object, not a Backbone model
        serializeData : function() {
            return this.model;
        }
    });


    var LinkView = BaseView.extend({
        className : "item",
        tagName : "li",
        triggers : {
            fastclick : "select"
        }
    });


    var ItemView = LinkView.extend({
        initialize : function() {
            // TODO: Remove change:balance => this.render
            this.model.on("change:balance change:priceModel", this.render);
        },
        onBeforeRender : function() {
            var css = this.options.css || this.css;
            if (css) this.$el.css(css);
        }
    });


    var BuyOnceItemView = ItemView.extend({
        initialize : function() {
            this.model.on("change", this.render, this);
            this.model.on("change:owned", this.disable, this);
        },
        triggers : {
            "fastclick" : "buy"
        },
        disable : function() {
            if (this.model.get("owned") === true) this.undelegateEvents();
        }
    });


    /**
     * A variation of the regular item view which has
     * different UI states - regular, owned and equipped
     */
    var EquippableItemView = ItemView.extend({
        className : "item equippable",
        initialize : function() {
            this.model.on({
                "change:priceModel" : this.render,
                "change:balance"    : this.onBalanceChange,
                "change:equipped"   : this.onEquippingChange
            }, this);
        },
        triggers : {
            "fastclick .buy"    : "buy",
            "fastclick .equip"  : "equip"
        },
        onBalanceChange : function() {
            (this.model.get("balance") >  0) ? this.$el.addClass("owned") : this.$el.removeClass("owned");
        },
        onEquippingChange : function() {
            this.model.get("equipped") ? this.$el.addClass("equipped") : this.$el.removeClass("equipped");
        }
    });


    var ExpandableEquipppableItemView = EquippableItemView.extend({
        onBalanceChange : function() {
            if (this.model.get("balance") >  0) {
                this.$el.addClass("owned");
                if (this.expanded) this.collapse();
            } else {
                this.$el.removeClass("owned");
            }
        }
    });


    // Extend functionality with expandable module and vendor prefixed transitionend event
    ExpandableEquipppableItemView.mixin = Backbone.View.mixin; // TODO: Solve this hack
    ExpandableEquipppableItemView.mixin(ExpandableModule);
    ExpandableEquipppableItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";


    var ExpandableSingleUseItemView = ItemView.extend({
        className : "item single-use",
        constructor : function(options) {
            ItemView.prototype.constructor.apply(this, arguments);
            this.model.on("change:balance", this.render);
        },
        triggers : {
            "fastclick .buy" : "buy"
        }
    });

    // Extend functionality with expandable module and vendor prefixed transitionend event
    ExpandableSingleUseItemView.mixin = Backbone.View.mixin; // TODO: Solve this hack
    ExpandableSingleUseItemView.mixin(ExpandableModule);
    ExpandableSingleUseItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";



    ////////////////////  Collection Views  /////////////////////

    // Common function for mixing into views
    var refreshIScroll = function() {
        this.iscroll.refresh();
    };


    var CollectionView = Marionette.CollectionView.extend({
        tagName : "ul",
        itemView : ItemView
    });


    var IScrollCollectionView = Marionette.CompositeView.extend({
        itemView : ItemView,
        itemViewContainer : "[data-iscroll='true']",
        onRender : function() {
            this.iscroll = new iScroll(this.getIScrollWrapper(), {hScroll: false, vScrollbar: false});
        },
        refreshIScroll : refreshIScroll,
        getIScrollWrapper : function() {
            return Marionette.getOption(this, "iscrollWrapper") || this.el;
        }
    });


    var ExpandableIScrollCollectionView = IScrollCollectionView.extend({
        itemView : ExpandableEquipppableItemView,
        onItemviewExpand : function(view) {
            if (this.expandedChild) this.expandedChild.collapse();
            this.expandedChild = view;
        },
        onItemviewCollapse : function(view) {
            delete this.expandedChild;
        },
        collapseExpandedChild : function() {
            if (this.expandedChild) {
                this.expandedChild.collapse();
                delete this.expandedChild;
            }
        },
        onItemviewExpandCollapseTransitionend : refreshIScroll
    });


    // TODO: Write unit test for this component
    var CarouselView = Marionette.CompositeView.extend({
        initialize : function() {
            _.bindAll(this, "switchActive");
        },
        events : {
            "click .next"       : "showNext",
            "click .previous"   : "showPrevious"
        },
        showNext : function() {
            this.activeIndex += 1;
            if (this.activeIndex == this.keys.length) this.activeIndex = 0;
            this.switchActive().trigger("next");
        },
        showPrevious : function() {
            this.activeIndex -= 1;
            if (this.activeIndex == -1) this.activeIndex = this.keys.length - 1;
            this.switchActive().trigger("previous");
        },
        switchActive : function() {
            this.activeChild.$el.hide();
            this.activeChild = this.children[this.keys[this.activeIndex]];
            this.activeChild.$el.show();
            return this;
        },
        onRender : function() {
            // Initialize variables necessary for next / previous functionality
            this.keys        = _.keys(this.children);
            this.activeIndex = 0;
            this.activeChild = this.children[this.keys[this.activeIndex]];

            _.each(this.children, function(view) {
                view.$el.hide();
            });
            this.activeChild.$el.show();
            return this;
        }
    });


    // TODO: Write unit test for this component
    var BaseStoreView = BaseView.extend({
        constructor : function(options) {

            if (!(options.model && options.model.get("theme"))) {
                var err = new Error("You must initialize the store with a model and make sure it has a theme");
                err.name = "InvalidInitializationError";
                throw err;
            }

            // Bind native API
            this.nativeAPI = options.nativeAPI || window.SoomlaNative;
            _.bindAll(this, "leaveStore", "wantsToLeaveStore", "wantsToBuyVirtualGoods", "wantsToBuyMarketItem", "playSound", "render");

            // Assign theme before initialize function is called
            this.theme = options.model.get("theme");

            // Create an object to store all child views
            this.children = new Backbone.ChildViewContainer();

            // Wrap onRender function if it exists
            if (this.onRender && _.isFunction(this.onRender)) {
                var originalOnRender = this.onRender;
                this.onRender = _.bind(function() {
                    originalOnRender.call(this);
                    this.finalizeRendering();
                }, this);
            }

            // Apply original Backbone.View constructor
            BaseView.prototype.constructor.apply(this, arguments);

            // Balance currency balance changes
            this.model.get("virtualCurrencies").on("change:balance", this.updateBalance, this);
        },
        serializeData : function() {
            var currencies      = this.model.get("virtualCurrencies").toJSON(),
                currencyImages  = this.model.get("modelAssets").virtualCurrencies;

            _.each(currencies, function(currency) {
                currency.imgFilePath = currencyImages[currency.itemId];
            });
            return _.extend({}, this.theme, {currencies : currencies});
        },
        openDialog : function() {
            var dialog = new ModalDialog({
                parent : this.$el,
                template : Handlebars.getTemplate("modalDialog"),
                model : this.dialogModel
            });

            var $this = this;
            dialog.on("cancel buyMore", function() {
                $this.playSound();
                dialog.close();
            }).on("buyMore", function() {
                $this.playSound().showCurrencyStore();
            });
            return dialog.render();
        },
        updateBalance : function(currency) {
            this.$("#balance-container label[data-currency='" + currency.id + "']").html(currency.get("balance"));
        },
        finalizeRendering : function() {
            // When all store images are loaded, trigger an event
            // TODO: Preload images that aren't visible at first
            var $this = this;
            this.$el.imagesLoaded(function() {
                $this.trigger("imagesLoaded");
            });

            this.adjustZoom();
            return this;
        },
        adjustZoom : function() {
            if (this.zoomFunction) {
                // Adjust zoom to fit nicely in viewport
                // This helps cope with various viewports, i.e. mobile, tablet...
                var $this = this;
                var adjustBodySize = function() {
                    var zoomFactor      = $this.zoomFunction(),
                    zoomPercentage  = (zoomFactor * 100) + "%";
                    $("body").css({
                        "zoom"                      : zoomFactor,
                        "-ms-text-size-adjust"      : zoomPercentage,
                        "-moz-text-size-adjust"     : zoomPercentage,
                        "-webkit-text-size-adjust"  : zoomPercentage
                    });
                };
                $(window).resize(adjustBodySize);
                adjustBodySize();
            }
        },
        leaveStore : function() {
            this.playSound().wantsToLeaveStore();
        }
    });
    _.extend(BaseStoreView.prototype, ViewMixins);


    return {
        BaseView                        : BaseView,
        ItemView                        : ItemView,
        LinkView                        : LinkView,
        BuyOnceItemView                 : BuyOnceItemView,
        EquippableItemView              : EquippableItemView,
        ExpandableEquipppableItemView   : ExpandableEquipppableItemView,
        ExpandableSingleUseItemView     : ExpandableSingleUseItemView,
        ModalDialog                     : ModalDialog,
        CollectionView                  : CollectionView,
        IScrollCollectionView           : IScrollCollectionView,
        ExpandableIScrollCollectionView : ExpandableIScrollCollectionView,
        CarouselView                    : CarouselView,
        BaseStoreView                   : BaseStoreView
    };
});