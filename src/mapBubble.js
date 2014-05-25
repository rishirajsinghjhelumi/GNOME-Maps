const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const MapBubble = new Lang.Class({
    Name: "MapBubble",
    Extends: Gtk.Popover,

    _init: function(params) {
        this.parent({
            relative_to: params.mapView
        });

        this._place = params.place;
        this._mapView = params.mapView;
    },

    getPlace: function() {
        return this._place;
    }
});