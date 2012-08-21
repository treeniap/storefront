define(["backbone", "templates/modal-component.handlebars"], function(Backbone) {

    var ModalDialog = Backbone.View.extend({
        className : "modal-container",
        events : {
            "touchend .close"    : "close",
            "touchend .modal"    : "close",
            "touchend .buy-more" : "close",
            "touchend .cancel"   : "close"
        },
        close : function(event) {
            this.remove();
            var command,
                className = (event && event.target) ? event.target.className : null;

            // Decide which command to dispatch as an argument according to the
            // target element's class
            switch (className) {
                case "buy-more" : command = "buyMore"; break;
                default : command = "cancel"; break; // "cancel" case
            }
            this.trigger("closed", command);
        },
        initialize : function() {
            _.bindAll(this, "close");
        },
        template : Handlebars.templates["modal-component"],
        render : function() {
            this.$el.html(this.template());
            this.options.parent.append(this.$el);
            return this;
        }
    });

    return {
        ModalDialog : ModalDialog
    };
});