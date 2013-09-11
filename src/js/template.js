define("template", ["underscore", "utils"], function(_, Utils) {

    var normalize = function(dimensions) {
        return {
            width   : dimensions.w,
            height  : dimensions.h
        };
    };

    var Template = function(json) {

        // Save the raw JSON internally
        this.json = json;
    };

    _.extend(Template.prototype, {
        getTemplateImageDimensions : function(keychain) {
            try {
                var res = Utils.getByKeychain(this.json.assetMetadata.template, keychain);
                return normalize(res);
            } catch (e) {
                return undefined;
            }
        },
        getSections : function() {
            return this.json.sections;
        },
        getVirtualGoodAssetDimensions : function(type) {

            var dimensions = this.json.assetMetadata.economy.goods[type];

            // Upgradable goods have two dimensions
            if (type === "goodUpgrades") return {
                upgradeImage : normalize(dimensions.upgradeImage),
                upgradeBar   : normalize(dimensions.upgradeBar)
            };

            return normalize(dimensions);
        },
        getCurrencyAssetDimensions : function() {
            return normalize(this.json.assetMetadata.economy.currencies);
        },
        getCurrencyPackAssetDimensions : function() {
            return normalize(this.json.assetMetadata.economy.currencyPacks);
        },
        getCategoryAssetDimensions : function() {
            return normalize(this.json.assetMetadata.economy.categories);
        }
    });


    return Template;
});
