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
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const Gio = imports.gi.Gio;

const MapLocation = imports.mapLocation;
const Application = imports.application;
const Utils = imports.utils;

const _POI_ICON_SIZE = 20;

const POILocation = new Lang.Class({
	Name: 'POILocation',
	Extends: MapLocation.MapLocation,

	_init: function(place) {

        this._mapView = Application.mapView;
        this._poiLayer = this._mapView.poiLayer;
        this._place = place;

        this._poiSelectedCallback = function(place) {
            log(place.name);
        };
	},

	show: function() {

		if(!this._place.get_icon()){
			return;
		}

		Utils.load_icon(this._place.get_icon(), _POI_ICON_SIZE, (function(pixbuf) {
            let image = new Clutter.Image();
            image.set_data(pixbuf.get_pixels(),
                           Cogl.PixelFormat.RGBA_8888,
                           pixbuf.get_width(),
                           pixbuf.get_height(),
                           pixbuf.get_rowstride());

            let iconMarker = new Champlain.CustomMarker();
            iconMarker.connect('notify::selected', (function() {
                this._poiSelectedCallback(this._place);
            }).bind(this));
            iconMarker.set_content(image);
        	iconMarker.set_size(pixbuf.get_width(), pixbuf.get_height());
        	iconMarker.set_location(this._place.location.latitude, this._place.location.longitude);

        	this._poiLayer.add_marker(iconMarker);

		}).bind(this));
	}

});
Signals.addSignalMethods(POILocation.prototype);
