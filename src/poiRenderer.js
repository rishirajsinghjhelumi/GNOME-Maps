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
const POIMapSource = imports.poiMapSource;
const Overpass = imports.overpass;
const Utils = imports.utils;

/**
 * The data that is cached using champlain in file system adds some extra characters at the end
 * of the JSON String. The method removes these charachters, so that the JSON is a list of POIs.
 */
function correctJSONData(data) {
    for(var i = data.length - 1; i >= 0; i--) {
        if (data[i] === ']')
            return data.substring(0, i + 1);
    }
    return '[]';
}

const POIRenderer = new Lang.Class({
    Name: 'POIRenderer',
    Extends: Champlain.Renderer,

    _init: function(mapView) {
        this._mapView = mapView;
        this._renderedTiles = {};
        this.parent();

        let view = this._mapView.view;
        let poiLayer = this._mapView.poiLayer;
        view.connect('notify::zoom-level', (function() {
            poiLayer.remove_all();
            this._renderedTiles = {};
            if (view.zoom_level >= POIMapSource.MIN_POI_DISPLAY_ZOOM_LEVEL) {
                poiLayer.show_all_markers();
            }
        }).bind(this));
    },

    vfunc_set_data: function(data, size) {
        this.data = data;
        this.size = size;
    },

    vfunc_render: function(tile) {
        tile.state = Champlain.State.LOADING;

        /** 
         * The tile has no data so,
         * its a rendering error. 
         */
        if (!this.data || this.size === 0) {
            tile.emit('render-complete', null, 0, true);
            return;
        }

        /**
         * The tile is already rendered and the data exists on the MarkerLayer so,
         * its not a rendering error. 
         */
        if (this.isRendered(tile)) {
            tile.data = null;
            tile.emit('render-complete', null, 0, false);
            return;
        }

        let places = null;
        try {
            places = JSON.parse(correctJSONData(Utils.unicodeToString(this.data)));
            places = places.map(Overpass.convertJSONPlaceToPOI);
        } catch (e) {
            places = [];
        }

        places.forEach((function(place) {
            let poiMarker = new POIMarker.POIMarker({ place: place,
                                                      mapView: this._mapView });
            poiMarker.addToLayer(this._mapView.poiLayer);
        }).bind(this));

        /**
         * The render-complete emit signal requires its first parameter to be G_TYPE_POINTER
         * but GJS is unable to convert the string to gpointer while passing which causes error.
         * The data is therefore passed as a property of the tile.
         */
        tile.data = this.data;
        this.setRendered(tile);
        tile.emit('render-complete', null, this.data.length, false);
    },

    setRendered: function(tile) {
        this._renderedTiles[(tile.get_x() + '/' + tile.get_y())] = true;
    },

    isRendered: function(tile) {
        return ((tile.get_x() + '/' + tile.get_y()) in this._renderedTiles);
    }
});
