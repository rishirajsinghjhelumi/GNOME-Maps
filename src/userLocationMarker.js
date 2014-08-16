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

const Champlain = imports.gi.Champlain;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const MapMarker = imports.mapMarker;
const Path = imports.path;
const UserLocationBubble = imports.userLocationBubble;
const Utils = imports.utils;
const _ = imports.gettext.gettext;

const AccuracyCircleMarker = new Lang.Class({
    Name: 'AccuracyCircleMarker',
    Extends: Champlain.Point,

    _init: function(params) {
        this.place = params.place;
        delete params.place;

        params.color = new Clutter.Color({ red: 0,
                                           blue: 255,
                                           green: 0,
                                           alpha: 50 });
        params.latitude = this.place.location.latitude;
        params.longitude = this.place.location.longitude;
        params.reactive = false;

        this.parent(params);
    },

    refreshGeometry: function(view) {
        let zoom = view.zoom_level;
        let source = view.map_source;
        let metersPerPixel = source.get_meters_per_pixel(zoom,
                                                         this.latitude,
                                                         this.longitude);
        let size = this.place.location.accuracy * 2 / metersPerPixel;

        if ((view.width > 0 && view.height > 0) &&
            (size > view.width && size > view.height))
            this.hide();
        else {
            this.size = size;
            this.show();
        }
    }
});

const UserLocationMarker = new Lang.Class({
    Name: 'UserLocation',
    Extends: MapMarker.MapMarker,

    _init: function(params) {
        this.parent(params);

        let iconActor = Utils.CreateActorFromImageFile(Path.ICONS_DIR + "/user-location.png");
        if (!iconActor)
            return;

        this.add_actor(iconActor);

        if (this.place.location.accuracy !== 0) {
            this._accuracyMarker = new AccuracyCircleMarker({ place: this.place });
            this._accuracyMarker.refreshGeometry(this._view);
            this._zoomLevelId = this._view.connect("notify::zoom-level",
                                                   this._accuracyMarker.refreshGeometry.bind(this._accuracyMarker));
        } else
            this._accuracyMarker = null;
    },

    _getHotSpot: function() {
        return [ Math.floor(this.width / 2),
                 Math.floor(this.height / 2) ];
    },

    _createBubble: function() {
        return new UserLocationBubble.UserLocationBubble({ place: this.place,
                                                           mapView: this._mapView });
    },

    addToLayer: function(layer) {
        if (this._accuracyMarker !== null)
            layer.add_marker(this._accuracyMarker);

        layer.add_marker(this);
    }
});
