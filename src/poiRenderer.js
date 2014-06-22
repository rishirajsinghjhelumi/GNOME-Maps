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
const Gio = imports.gi.Gio;

const Utils = imports.utils;
const GeoMath = imports.geoMath;
const Overpass = imports.overpass;
const POI = imports.poi;
const MapOverlaySource = imports.mapOverlaySource;
const Application = imports.application;
const POILocation = imports.poiLocation;

const _POI_ICON_SIZE = 20;

const POIRenderer = new Lang.Class({
	Name: 'POIRenderer',
    Extends: Champlain.Renderer,

    _init: function() {
    	this.parent();
    	this._mapOverlaySource = new MapOverlaySource.MapOverlaySource();
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

        let places = JSON.parse(unescape(this.data));
        places = places.map(POI.convertJSONPlaceToPOI);

        // let actor = new Clutter.Actor();
        this._poiLayer = Application.mapView.poiLayer;

        this._poiOuterCircleImage = null;
        Utils.load_icon(Gio.ThemedIcon.new('poi-circle-red'), _POI_ICON_SIZE, (function(pixbuf) {
            let image = new Clutter.Image();
            image.set_data(pixbuf.get_pixels(),
                           Cogl.PixelFormat.RGBA_8888,
                           pixbuf.get_width(),
                           pixbuf.get_height(),
                           pixbuf.get_rowstride());
            this._poiOuterCircleImage = image;
        }).bind(this));

        places.forEach((function(place) {
            if (!place.icon)
                return;

            let poiLocation = new POILocation.POILocation(place);
            poiLocation.show();

        }).bind(this));

        this._poiLayer.show_all_markers();

        // tile.set_content(actor);
        // tile.set_fade_in(true);

        tile.data = this.data; // Hack
        tile.emit('render-complete', null, this.data.length, false);
    }
});
Signals.addSignalMethods(POIRenderer.prototype);