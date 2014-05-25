const Lang = imports.lang;

const MapBubble = imports.mapBubble;
const MapMarker = imports.mapMarker;
const Utils = imports.utils;

const UserLocationBubble = new Lang.Class({
    Name: "UserLocationBubble",
    Extends: MapBubble.MapBubble,

    _init: function(params) {
        this.parent(params);

        let ui = Utils.getUIObject('user-location-bubble', [
            'box',
            'label-latitude',
            'label-longitude',
            'label-accuracy'
        ]);

        ui.labelLatitude.label = this._place.location.latitude + '';
        ui.labelLongitude.label = this._place.location.longitude + '';
        ui.labelAccuracy.label = MapMarker.getAccuracyDescription(this._place.location.accuracy);

        this.add(ui.box);
    }
});