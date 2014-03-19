/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2011, 2012, 2013 Red Hat, Inc.
 *
 * GNOME Maps is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * GNOME Maps is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with GNOME Maps; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Zeeshan Ali (Khattak) <zeeshanak@gnome.org>
 */

const Clutter = imports.gi.Clutter;
const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;
const GObject = imports.gi.GObject;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;

const Utils = imports.utils;
const Path = imports.path;
const PlaceStore = imports.placeStore;
const _ = imports.gettext.gettext;
const Application = imports.application;

const _MAX_DISTANCE = 19850; // half of Earth's curcumference (km)
const _MIN_ANIMATION_DURATION = 2000; // msec
const _MAX_ANIMATION_DURATION = 5000; // msec

const _FAVORITE_ICON_SIZE = 20;

// A map location object with an added accuracy.
const MapLocation = new Lang.Class({
    Name: 'MapLocation',

    _init: function(place, mapView) {
        if (place.bounding_box !== null) {
            this.bbox = new Champlain.BoundingBox({
                top: place.bounding_box.top,
                bottom: place.bounding_box.bottom,
                left: place.bounding_box.left,
                right: place.bounding_box.right
            });
        } else {
            this.bbox = null;
        }

        this._mapView = mapView;
        this._view = mapView.view;
        this._place = place;
        this.latitude = place.location.latitude;
        this.longitude = place.location.longitude;
        this.description = place.location.description;
        this.accuracy = place.location.accuracy;
        this.type = place.place_type;

        this._initActors();
    },

    // Go to this location from the current location on the map, optionally
    // with an animation
    // TODO: break this out somewhere, this is useful in other cases as well.
    goTo: function(animate) {
        Utils.debug("Going to " + this.description);

        if (!animate) {
            this._view.center_on(this.latitude, this.longitude);
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
            this._view.go_to(this.latitude, this.longitude);
        }).bind(this));

        this._ensureVisible(fromLocation);
    },

    show: function(layer) {
        layer.remove_all();

        let marker = new Champlain.CustomMarker();
        marker.set_location(this.latitude, this.longitude);
        marker.connect('notify::size', (function() {
            let translate_x = -Math.floor(marker.get_width() / 2);
            marker.set_translation(translate_x,-marker.get_height(),0);
        }).bind(this));

        let text = _("%s").format (this.description);
        let textActor = new Clutter.Text({ text: text });
        textActor.set_use_markup(true);
        textActor.set_margin_left(6);
        textActor.set_margin_right(6);
        textActor.set_color(new Clutter.Color({ red: 255,
                                                blue: 255,
                                                green: 255,
                                                alpha: 255 }));
        let layout = new Clutter.BinLayout();
        let descriptionActor = new Clutter.Actor({ layout_manager: layout });
        descriptionActor.add_child(this._bubbleActor);
        descriptionActor.add_child(textActor);

        this._addFavoriteToggleActor(descriptionActor);

        layout = new Clutter.BoxLayout({ vertical: true });
        let locationActor = new Clutter.Actor({ layout_manager: layout });
        locationActor.add_child(descriptionActor);

        marker.add_actor(locationActor);

        layer.add_marker(marker);

    },

    _initActors: function(){

        this._bubbleActor = Utils.CreateActorFromImageFile(Path.ICONS_DIR + "/bubble.svg");
        if (!this._bubbleActor)
            return;
        this._bubbleActor.set_x_expand(true);
        this._bubbleActor.set_y_expand(true);

        this._pinActor = Utils.CreateActorFromImageFile(Path.ICONS_DIR + "/pin.svg");
        if (!this._pinActor)
            return;

    },

    _addFavoriteToggleActor: function(descriptionActor){

        let favoriteMarkedActor = Utils.CreateActorFromImageFile(Path.ICONS_DIR + "/favorite-checked.svg");
        if (!favoriteMarkedActor)
            return;

        let favoriteUnMarkedActor = Utils.CreateActorFromImageFile(Path.ICONS_DIR + "/favorite-unchecked.svg");
        if (!favoriteUnMarkedActor)
            return;

        let [bubbleSizeX, bubbleSizeY] = descriptionActor.get_size();
        let self = this;

        favoriteUnMarkedActor.set_position(bubbleSizeX - _FAVORITE_ICON_SIZE - 5, 10);
        favoriteUnMarkedActor.set_reactive(true);
        favoriteUnMarkedActor.set_size(_FAVORITE_ICON_SIZE,_FAVORITE_ICON_SIZE);
        favoriteUnMarkedActor.connect("button-press-event", function(stage, event) {
            descriptionActor.remove_child(favoriteUnMarkedActor);
            descriptionActor.add_child(favoriteMarkedActor);
            self._onFavoriteClick(true);
        });

        favoriteMarkedActor.set_position(bubbleSizeX - _FAVORITE_ICON_SIZE - 5, 10);
        favoriteMarkedActor.set_reactive(true);
        favoriteMarkedActor.set_size(_FAVORITE_ICON_SIZE,_FAVORITE_ICON_SIZE);
        favoriteMarkedActor.connect("button-press-event", function(stage, event) {
            descriptionActor.remove_child(favoriteMarkedActor);
            descriptionActor.add_child(favoriteUnMarkedActor);
            self._onFavoriteClick(false);
        });

        if(this._isFavorite(this._place)){
            descriptionActor.add_child(favoriteMarkedActor);
        }
        else{
            descriptionActor.add_child(favoriteUnMarkedActor);
        }

    },

    _onFavoriteClick: function(mark){
        if(!this._place)
            return;

        if(mark)
            Application.placeStore.addFavorite(this._place);
        else
            Application.placeStore.removePlace(this._place,PlaceStore.PlaceType.FAVORITE);
    },

    _isFavorite: function(place){
        return Application.placeStore.exists(place,PlaceStore.PlaceType.FAVORITE);
    },

    showNGoTo: function(animate, layer) {
        this.show(layer);
        this.goTo(animate);
    },

    // Zoom to the maximal zoom-level that fits the place type
    zoomToFit: function() {
        let zoom;

        if (this.bbox !== null) {
            let max = this._view.max_zoom_level;
            let min = this._view.min_zoom_level;
            for (let i = max; i >= min; i--) {
                let zoom_box = this._view.get_bounding_box_for_zoom_level(i);
                if (this._boxCovers(zoom_box)) {
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
        switch(this.accuracy) {
        case Geocode.LOCATION_ACCURACY_UNKNOWN:
            /* Translators: Accuracy of user location information */
            return _("Unknown");
        case 0:
            /* Translators: Accuracy of user location information */
            return _("Exact");
        default:
            let area =  Math.PI * Math.pow(this.accuracy / 1000, 2);

            Utils.debug(this.accuracy + " => " + area);
            if (area >= 1)
                area = Math.floor(area);
            else
                area = Math.floor(area * 10) / 10;

            return area.toString() + _(" km<sup>2</sup>");
        }
    },

    _ensureVisible: function(fromLocation) {
        if (this.bbox !== null && this.bbox.is_valid()) {
            let visibleBox = this.bbox.copy();

            visibleBox.extend(fromLocation.latitude, fromLocation.longitude);
            this._view.ensure_visible(visibleBox, true);
        } else {
            this._mapView.ensureLocationsVisible([fromLocation, this]);
        }
    },

    _boxCovers: function(coverBox) {
        if (this.bbox === null)
            return false;

        if (coverBox.left > this.bbox.left)
            return false;

        if (coverBox.right < this.bbox.right)
            return false;

        if (coverBox.top < this.bbox.top)
            return false;

        if (coverBox.bottom > this.bbox.bottom)
            return false;

        return true;
    },

    _updateGoToDuration: function(fromLocation) {
        let toLocation = new Geocode.Location({
            latitude: this.latitude,
            longitude: this.longitude
        });

        let distance = fromLocation.get_distance_from(toLocation);
        let duration = (distance / _MAX_DISTANCE) * _MAX_ANIMATION_DURATION;

        // Clamp duration
        duration = Math.max(_MIN_ANIMATION_DURATION,
                            Math.min(duration, _MAX_ANIMATION_DURATION));

        // We divide by two because Champlain treats both go_to and
        // ensure_visible as 'goto' journeys with its own duration.
        this._view.goto_animation_duration = duration / 2;
    }
});
Utils.addSignalMethods(MapLocation.prototype);
