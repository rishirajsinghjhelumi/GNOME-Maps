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
 * Author: Rishi Raj Singh Jhelumi <rishiraj.devel@gmail.com>
 */

const Lang = imports.lang;

const Champlain = imports.gi.Champlain;

const POIMarker = imports.poiMarker;
const Overpass = imports.overpass;

const _UNKNOWN = 'Unknown';
const _MIN_POI_DISPLAY_ZOOM_LEVEL = 16;

const POIRenderer = new Lang.Class({
    Name: 'POIRenderer',
    Extends: Champlain.Renderer,

    _init: function(mapView) {
        this._mapView = mapView;
        this.parent();

        let view = this._mapView.view;
        let poiLayer = this._mapView.poiLayer;
        view.connect('notify::zoom-level', (function() {
            if(view.zoom_level < _MIN_POI_DISPLAY_ZOOM_LEVEL) {
                poiLayer.remove_all();
            }
            else {
                poiLayer.show_all_markers();
            }
        }).bind(this));
    },

    vfunc_set_data: function(data, size) {
        this.data = data;
        this.size = size;
    },

    vfunc_render: function(tile) {
        tile.set_state(Champlain.State.LOADING);

        if (!this.data) {
            tile.emit('render-complete', null, 0, true);
            return;
        }

        let places = JSON.parse(unescape(this.data));
        places = places.map(Overpass.convertJSONPlaceToPOI);

        places.forEach((function(place) {
            if(place.name == _UNKNOWN)
                return;

            let poiMarker = new POIMarker.POIMarker({
                place: place,
                mapView: this._mapView
            });
        }).bind(this));

        tile.data = this.data; // Hack
        tile.emit('render-complete', null, this.data.length, false);
    }
});