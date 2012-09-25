define(["jquery", "backbone", "components", "viewMixins", "cssUtils", "handlebars", "templates"], function($, Backbone, Components, ViewMixins, CssUtils, Handlebars) {

    var StoreView = Components.BaseStoreView.extend({
        initialize : function() {
            _.bindAll(this, "wantsToLeaveStore", "updateBalance",
                            "render", "showCurrencyStore", "showGoodsStore", "openDialog",
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

        },
        events : {
            "touchend .leave-store" : "wantsToLeaveStore",
            "touchend .buy-more"    : "showCurrencyStore",
            "touchend .back"        : "showGoodsStore"
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
            this.$("#currency-store").one(CssUtils.getTransitionendEvent(), function(){ $(this).css("visibility", "hidden"); }).removeClass("visible");
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
        onRender : function() {
            this.$("#currency-store").css("visibility", "hidden");

            // Render subviews (items in goods store and currency store)
            this.$("#goods-store .items-container").html(this.virtualGoodsView.render().el);
            this.$("#currency-store .items-container").html(this.currencyPacksView.render().el);
        }
    });
    _.extend(StoreView.prototype, ViewMixins);

    return {
        StoreView : StoreView
    };
});