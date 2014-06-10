/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
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
 * Author: Jonas Danielsson <jonas@threetimestwo.org>
 */

const Lang = imports.lang;

const Signals = imports.signals;
const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const GLib = imports.gi.GLib;

const Utils = imports.utils;
const GeoMath = imports.geoMath;
const Overpass = imports.overpass;
const POI = imports.poi;
const MapOverlaySource = imports.mapOverlaySource;

const _POI_ICON_SIZE = 20;

const POIRenderer = new Lang.Class({
	Name: 'POIRenderer',
    Extends: Champlain.Renderer,

    _init: function() {
    	this.parent();
    	this._mapOverlaySource = new MapOverlaySource.MapOverlaySource();

    	this._poiSelectedCallback = function(place) {
            log(place.name);
        };
    },

    vfunc_set_data: function(data, size) {
    	this.data = data;
    	this.size = size;
    },

    vfunc_render: function(tile) {

    	tile.set_state(Champlain.State.LOADING);

    	if (!this.data){
    		tile.emit('render-complete', null, 0, true);
            return;
    	}

        log(this.size);
        log(this.data.length);
        let places = JSON.parse(unescape(this.data));
        places = places.map(POI.convertJSONPlaceToPOI);

        let actor = new Clutter.Actor();

        places.forEach((function(place) {
            if (!place.icon)
                return;

            Utils.load_icon(place.icon, _POI_ICON_SIZE, (function(pixbuf) {
                let image = new Clutter.Image();
                image.set_data(pixbuf.get_pixels(),
                               Cogl.PixelFormat.RGBA_8888,
                               pixbuf.get_width(),
                               pixbuf.get_height(),
                               pixbuf.get_rowstride());

                let iconMarker = new Champlain.Marker();
                iconMarker.connect('notify::selected', (function() {
                    this._poiSelectedCallback(place);
                }).bind(this));
                iconMarker.set_content(image);
                iconMarker.set_size(pixbuf.get_width(), pixbuf.get_height());
                let tileLat = GeoMath.tileToLatitude(tile.zoom_level, tile.y);
                let tileLon = GeoMath.tileToLongitude(tile.zoom_level, tile.x);
                let location = place.location;
                let x =
                    this._mapOverlaySource.get_x(tile.zoom_level, location.longitude) -
                    this._mapOverlaySource.get_x(tile.zoom_level, tileLon);
                let y =
                    this._mapOverlaySource.get_y(tile.zoom_level, location.latitude) -
                    this._mapOverlaySource.get_y(tile.zoom_level, tileLat);
                iconMarker.set_position(x, y);
                actor.add_child(iconMarker);
            }).bind(this));
        }).bind(this));

        tile.set_content(actor);
        tile.set_fade_in(true);

        // let data = GLib.Bytes.new_take(this.data, this.data.length);
        tile.data = this.data; // Hack
        tile.emit('render-complete', null, this.data.length, false);
    }
});
Signals.addSignalMethods(POIRenderer.prototype);