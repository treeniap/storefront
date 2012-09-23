define(["jquery", "backbone", "components", "handlebars", "templates"], function($, Backbone, Components, Handlebars) {

    // Determine which CSS transition event to bind according to the browser vendor
    var transEndEventNames = {
        'WebkitTransition' : 'webkitTransitionEnd',
        'MozTransition'    : 'transitionend',
        'OTransition'      : 'oTransitionEnd',
        'msTransition'     : 'MSTransitionEnd',
        'transition'       : 'transitionend'
    },
    transitionend = transEndEventNames[ Modernizr.prefixed('transition') ];

    var StoreView = Backbone.View.extend({
        initialize : function() {
            _.bindAll(this, "wantsToLeaveStore", "updateBalance",
                            "render", "showCurrencyStore", "showGoodsStore", "openDialog",
                            "switchCategory", "showMenu",
                            "wantsToBuyVirtualGoods", "wantsToBuyCurrencyPacks");

            this.nativeAPI  = this.options.nativeAPI || window.SoomlaNative;
            this.theme      = this.model.get("theme");

            this.model.get("virtualCurrencies").on("change:balance", this.updateBalance); // TODO: Fix


            var virtualGoods  = this.model.get("virtualGoods"),
                currencyPacks = this.model.get("currencyPacks"),
                $this = this;

            // Add UI rendering properties to models.
            virtualGoods.each(function(good) { good.set("itemBackground", $this.theme.pages.goods.listItem.itemBackground); });
            currencyPacks.each(function(pack) { pack.set("itemBackground", $this.theme.pages.currencyPacks.listItem.itemBackground); });

            // Initialize sub-views, but defer providing an "el" until the rendering phase
            // This will enable us to construct the view objects once and then render as many times
            // as we like without losing the jQuery bindings each time.
            // Based on: http://ianstormtaylor.com/rendering-views-in-backbonejs-isnt-always-simple/
            this.virtualGoodsView = new Components.CollectionListView({
                className           : "items virtualGoods",
                collection          : virtualGoods,
                template            : Handlebars.getTemplate("themes/" + this.theme.name + "/templates", "item"),
                templateProperties  : {},
                css                 : { "background-image" : "url('" + this.theme.pages.goods.listItem.background + "')" }
            }).on("selected", this.wantsToBuyVirtualGoods);
            this.currencyPacksView = new Components.CollectionListView({
                className           : "items currencyPacks",
                collection          : currencyPacks,
                template            : Handlebars.getTemplate("themes/" + this.theme.name + "/templates", "currencyPack"),
                templateProperties  : {},
                css                 : { "background-image" : "url('" + this.theme.pages.currencyPacks.listItem.background + "')" }
            }).on("selected", this.wantsToBuyCurrencyPacks);

            var categories = new Backbone.Collection(this.model.get("categories"));


            var Pageview = Backbone.View.extend({
                render : function() {
                    this.$el.html("This is the category: " + this.model.get("name"));
                    return this;
                }
            });
            this.pageViews = [];
            categories.each(function(category) {
                var view = new Pageview({
                    className : "category " + category.get("name"),
                    model : category
                });
                $this.pageViews.push(view);
            });
            this.pageViews.push(this.currencyPacksView);

            categories.add({name : "currencyPacks"});
            this.categoryMenuView = new Components.CollectionGridView({
                className           : "items virtualGoods",
                collection          : categories,
                template            : Handlebars.getTemplate("themes/" + this.theme.name + "/templates", "item"),
                templateProperties  : {columns : 4}
            }).on("selected", this.switchCategory);



            var HeaderView = Backbone.View.extend({
                events : {
                    "click .goBack" : function() {
                        this.trigger("back");
                    }
                }
            });
            this.header = new HeaderView().on("back", this.showMenu);




        },
        events : {
            "touchend .leave-store" : "wantsToLeaveStore",
            "touchend .buy-more"    : "showCurrencyStore",
            "touchend .back"        : "showGoodsStore"
        },
        switchCategory : function(model) {
            this.$(".menu").hide();
            this.$(".category").hide();
            this.$(".category." + model.get("name")).show();
        },
        showMenu : function() {
            this.$(".menu").show();
            this.$(".category").hide();
        },
        wantsToLeaveStore : function(event) {
            if (this.options.callbacks && this.options.callbacks.beforeLeave) this.options.callbacks.beforeLeave();
            event.preventDefault();

            // TODO: Release view bindings and destroy view
            this.nativeAPI.wantsToLeaveStore();
        },
        updateBalance : function(model) {
            this.$(".header .balance label").html(model.get("balance"));
        },
        showCurrencyStore : function() {
            // When this flag is raised, there is no connectivity,
            // thus don't show the currency store
            if (this.model.get("isCurrencyStoreDisabled")) {
                alert("Buying more " + this.model.get("currency").get("name") + " is unavailable. Check your internet connectivity and try again.");
            } else {
                this.$("#currency-store").css("visibility", "").addClass("visible");
            }
        },
        showGoodsStore : function() {
            this.$("#currency-store").one(transitionend, function(){ $(this).css("visibility", "hidden"); }).removeClass("visible");
        },
        openDialog : function(currency) {
            new Components.ModalDialog({
                parent : this.$el,
                model : this.theme.pages.goods.noFundsModal,
                template : Handlebars.getTemplate("themes/" + this.theme.name + "/templates", "modalDialog")
            }).render().on("closed", function(command) {
                if (command == "buyMore") this.showCurrencyStore();
            }, this);
            return this;
        },
        render : function() {
            var context = _.extend({}, this.theme, {currencies : this.model.get("virtualCurrencies").toJSON()});
            this.$el.html(this.options.template(context));
            this.$("#currency-store").css("visibility", "hidden");

            this.header.setElement(this.$(".header"));

            // Render subviews (items in goods store and currency store)
            this.$("#goods-store .items-container").html(this.virtualGoodsView.render().el);
//            this.$("#currency-store .items-container").html(this.currencyPacksView.render().el);
            this.$(".menu").html(this.categoryMenuView.render().el);

            var $this = this;
            _.each(this.pageViews, function(view) {
                $this.$(".categories").append(view.render().el);
            });

            return this;
        },
        wantsToBuyVirtualGoods : function(model) {
            this.nativeAPI.wantsToBuyVirtualGoods(model.toJSON().itemId);
        },
        wantsToBuyCurrencyPacks : function(model) {
            this.nativeAPI.wantsToBuyCurrencyPacks(model.toJSON().productId);
        }
    });


    return {
        StoreView : StoreView
    };
});