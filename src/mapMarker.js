const cairo = imports.gi.cairo;
const Clutter = imports.gi.Clutter;
const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;

const Lang = imports.lang;
const Signals = imports.signals;

const Utils = imports.utils;
const Path = imports.path;
const _ = imports.gettext.gettext;

const _MAX_DISTANCE = 19850; // half of Earth's curcumference (km)
const _MIN_ANIMATION_DURATION = 2000; // msec
const _MAX_ANIMATION_DURATION = 5000; // msec

function getAccuracyDescription(accuracy) {
    switch(accuracy) {
    case Geocode.LOCATION_ACCURACY_UNKNOWN:
        /* Translators: Accuracy of user location information */
        return _("Unknown");
    case 0:
        /* Translators: Accuracy of user location information */
        return _("Exact");
    default:
        let area =  Math.PI * Math.pow(accuracy / 1000, 2);

        Utils.debug(accuracy + " => " + area);
        if (area >= 1)
            area = Math.floor(area);
        else
            area = Math.floor(area * 10) / 10;

        return area.toString() + _(" km²");
    }
}

const MapMarker = new Lang.Class({
    Name: "MapMarker",
    Extends: Champlain.Marker,

    _init: function(params) {
        this.parent();

        this._place = params.place;
        this._mapView = params.mapView;
        this._view = this._mapView.view;
        this._bubble = null;
        this._boundingBox = this._createBoundingBox(this._place);

        this.set_location(this._place.location.latitude,
                          this._place.location.longitude);
        this.set_selectable(true);

        this.connect('notify::size', (this._translateMarkerPosition).bind(this));
        this.connect("notify::selected", (this._onMarkerSelected).bind(this));

        this._view.connect("notify::zoom-level", this.hideBubble.bind(this));
        this._view.connect("button-press-event", this.hideBubble.bind(this));
    },

    _translateMarkerPosition: function() {
        let translation = this._getMarkerPositionTranslationData();
        this.set_translation(translation[0], translation[1], translation[2]);
    },

    _getMarkerPositionTranslationData: function() {
        return [0, 0, 0];
    },

    _getBubblePositionTranslationData: function() {
        return [0, 0]
    },

    _createBoundingBox: function(place) {
        if (place.bounding_box !== null) {
            return new Champlain.BoundingBox({
                top: place.bounding_box.top,
                bottom: place.bounding_box.bottom,
                left: place.bounding_box.left,
                right: place.bounding_box.right
            });
        } else {
            return null;
        }
    },

    getPlace: function() {
        return this._place;
    },

    getBubble: function() {
        if (this._bubble == null) {
            this._bubble = this._createBubble();
        }

        return this._bubble;
    },

    _createBubble: function() {
        return null;
    },

    _positionBubble: function(bubble) {
        let [x, y] = this.get_transformed_position();
        let translation = this._getBubblePositionTranslationData();

        //FIXME: the bubble is not well positioned
        let pos = new cairo.RectangleInt({
            x: x + translation[0],
            y: y + translation[1],
            width: 1,
            height: 1
        });

        bubble.set_pointing_to(pos);
    },

    showBubble: function() {
        let bubble = this.getBubble();

        if (bubble != null) {
            this._positionBubble(bubble);
            bubble.show_all();
        }
    },

    hideBubble: function() {
        let bubble = this.getBubble();

        if (bubble != null) {
            bubble.hide();
        }
    },

    addToLayer: function(layer) {
        layer.add_marker(this);
    },

    // Zoom to the maximal zoom-level that fits the place type
    zoomToFit: function() {
        let zoom;

        if (this._boundingBox !== null) {
            let max = this._view.max_zoom_level;
            let min = this._view.min_zoom_level;
            for (let i = max; i >= min; i--) {
                let zoomBox = this._view.get_bounding_box_for_zoom_level(i);
                if (this._boxCovers(zoomBox)) {
                    zoom = i;
                    break;
                }
            }
        } else {
            switch (this.placeType) {
            case Geocode.PlaceType.STREET:
                zoom = 16;
                break;

            case Geocode.PlaceType.CITY:
                zoom = 11;
                break;

            case Geocode.PlaceType.REGION:
                zoom = 10;
                break;

            case Geocode.PlaceType.COUNTRY:
                zoom = 6;
                break;

            default:
                zoom = 11;
                break;
            }
        }
        this._view.set_zoom_level(zoom);
    },

    getAccuracyDescription: function() {
        return getAccuracyDescription(this._place.location.accuracy);
    },

    goTo: function(animate) {
        Utils.debug("Going to " + this.description);

        if (!animate) {
            this._view.center_on(this.get_latitude(), this.get_longitude());
            this.zoomToFit();
            this.emit('gone-to');

            return;
        }

        /* Lets first ensure that both current and destination location are visible
         * before we start the animated journey towards destination itself. We do this
         * to create the zoom-out-then-zoom-in effect that many map implementations
         * do. This not only makes the go-to animation look a lot better visually but
         * also give user a good idea of where the destination is compared to current
         * location.
         */

        this._view.goto_animation_mode = Clutter.AnimationMode.EASE_IN_CUBIC;

        let fromLocation = new Geocode.Location({
            latitude: this._view.get_center_latitude(),
            longitude: this._view.get_center_longitude()
        });
        this._updateGoToDuration(fromLocation);

        Utils.once(this._view, "animation-completed", (function() {
            Utils.once(this._view, "animation-completed::go-to", (function() {
                this.zoomToFit();
                this._view.goto_animation_mode = Clutter.AnimationMode.EASE_IN_OUT_CUBIC;
                this.emit('gone-to');
            }).bind(this));

            this._view.goto_animation_mode = Clutter.AnimationMode.EASE_OUT_CUBIC;
            this._view.go_to(this.get_latitude(), this.get_longitude());
        }).bind(this));

        this._ensureVisible(fromLocation);
    },

    _ensureVisible: function(fromLocation) {
        if (this._boundingBox !== null && this._boundingBox.is_valid()) {
            let visibleBox = this._boundingBox.copy();

            visibleBox.extend(fromLocation.latitude, fromLocation.longitude);
            this._view.ensure_visible(visibleBox, true);
        } else {
            this._mapView.ensureLocationsVisible([fromLocation, this]);
        }
    },

    _boxCovers: function(coverBox) {
        if (this._boundingBox === null)
            return false;

        if (coverBox.left > this._boundingBox.left)
            return false;

        if (coverBox.right < this._boundingBox.right)
            return false;

        if (coverBox.top < this._boundingBox.top)
            return false;

        if (coverBox.bottom > this._boundingBox.bottom)
            return false;

        return true;
    },

    _updateGoToDuration: function(fromLocation) {
        let toLocation = this._place.location;

        let distance = fromLocation.get_distance_from(toLocation);
        let duration = (distance / _MAX_DISTANCE) * _MAX_ANIMATION_DURATION;

        // Clamp duration
        duration = Math.max(_MIN_ANIMATION_DURATION,
                            Math.min(duration, _MAX_ANIMATION_DURATION));

        // We divide by two because Champlain treats both go_to and
        // ensure_visible as 'goto' journeys with its own duration.
        this._view.goto_animation_duration = duration / 2;
    },

    _onMarkerSelected: function() {
        this.showBubble();
    }

});
