/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2014 Damián Nohales
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
 * Author: Damián Nohales <damiannohales@gmail.com>
 */

const Cairo = imports.gi.cairo;
const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;
const GObject = imports.gi.GObject;

const Lang = imports.lang;

const MapWalker = imports.mapWalker;
const Utils = imports.utils;

const MapMarker = new Lang.Class({
    Name: 'MapMarker',
    Extends: Champlain.Marker,
    Abstract: true,
    Signals: {
        'gone-to': { }
    },

    _init: function(params) {
        this._place = params.place;
        delete params.place;

        this._mapView = params.mapView;
        delete params.mapView;

        this._view = this._mapView.view;
        this._bubble = undefined;
        this._walker = undefined;

        params.latitude = this.place.location.latitude;
        params.longitude = this.place.location.longitude;
        params.selectable = true;

        this.parent(params);

        this.connect('notify::size', this._translateMarkerPosition.bind(this));
        this.connect('notify::selected', this._onMarkerSelected.bind(this));

        // Some markers are draggable, with want to sync the marker location and
        // the location saved in the GeocodePlace
        this.bind_property('latitude', this.place.location, 'latitude', 0);
        this.bind_property('longitude', this.place.location, 'longitude', 0);
    },

    _translateMarkerPosition: function() {
        let [hsx, hsy] = this._getHotSpot();
        this.set_translation(-hsx, -hsy, 0);
    },

    /**
     * Returns: an array with the X and Y component of the point relative to
     * the marker actor that should point to the specified coordinates in the
     * map. [0, 0] represents the top-left corner of the marker actor.
     */
    _getHotSpot: function() {
        return [0, 0];
    },

    _getBubbleSpacing: function() {
        return 0;
    },

    get place() {
        return this._place;
    },

    get bubble() {
        if (!this._isBubbleInitialized())
            this._bubble = this._createBubble();

        return this._bubble;
    },

    _isBubbleInitialized: function() {
        // undefined means 'uninitialized' and null means 'without bubble'
        return typeof this._bubble != 'undefined';
    },

    _createBubble: function() {
        // Markers has no associated bubble by default
        return null;
    },

    _positionBubble: function(bubble) {
        let [tx, ty, tz] = this.get_translation();
        let [x, y] = [ this._view.longitude_to_x(this.longitude) + tx,
                       this._view.latitude_to_y(this.latitude)   + ty ];
        let spacing = this._getBubbleSpacing();

        let pos = new Cairo.RectangleInt({ x: x,
                                           y: y - spacing,
                                           width: this.width,
                                           height: this.height + spacing * 2 });

        bubble.pointing_to = pos;
    },

    showBubble: function() {
        let bubble = this.bubble;

        if (bubble !== null) {
            this._mapView.emit('marker-selected');

            let signals = {};

            let callback = (function() {
                this.selected = false;
            }).bind(this);

            signals.mapViewMarkerSelected = this._mapView.connect('marker-selected', this.hideBubble.bind(this));
            signals.viewNotifyZoomLevel = this._view.connect('notify::zoom-level', callback);
            signals.viewButtonPressEvent = this._view.connect('button-press-event', callback);
            signals.viewNotifySize = this._view.connect('notify::size', callback);
            signals.thisParentSet = this.connect('parent-set', callback);
            signals.thisDragMotion = this.connect('drag-motion', callback);

            Utils.once(bubble, 'closed', (function() {
                this._mapView.disconnect(signals.mapViewMarkerSelected);
                this._view.disconnect(signals.viewNotifyZoomLevel);
                this._view.disconnect(signals.viewButtonPressEvent);
                this._view.disconnect(signals.viewNotifySize);
                this.disconnect(signals.thisParentSet);
                this.disconnect(signals.thisDragMotion);
            }).bind(this));

            this._positionBubble(bubble);
            bubble.show();
        }
    },

    hideBubble: function() {
        if (!this._isBubbleInitialized())
            return;

        let bubble = this.bubble;

        if (bubble !== null)
            bubble.hide();
    },

    addToLayer: function(layer) {
        layer.add_marker(this);
    },

    get walker() {
        if (typeof this._walker == 'undefined')
            this._walker = new MapWalker.MapWalker(this.place, this._mapView);

        return this._walker;
    },

    zoomToFit: function() {
        this.walker.zoomToFit();
    },

    goTo: function(animate) {
        Utils.once(this.walker, 'gone-to', (function() {
            this.emit('gone-to');
        }).bind(this));

        this.walker.goTo(animate);
    },

    _onMarkerSelected: function() {
        if (this.selected)
            this.showBubble();
        else
            this.hideBubble();
    }
});
