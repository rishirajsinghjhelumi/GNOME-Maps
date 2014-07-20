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
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const Gio = imports.gi.Gio;

const MapMarker = imports.mapMarker;
const POIBubble = imports.poiBubble;
const Utils = imports.utils;

const _POI_ICON_SIZE = 20;

const POIMarker = new Lang.Class({
    Name: 'POIMarker',
    Extends: MapMarker.MapMarker,

    _init: function(params) {
        this.parent(params);

        Utils.load_icon(this.place.get_icon(), _POI_ICON_SIZE, (function(pixbuf) {
            let image = new Clutter.Image();
            image.set_data(
                pixbuf.get_pixels(),
                Cogl.PixelFormat.RGBA_8888,
                pixbuf.get_width(),
                pixbuf.get_height(),
                pixbuf.get_rowstride()
            );

            this.set_content(image);
            this.set_size(pixbuf.get_width(), pixbuf.get_height());
        }).bind(this));

        this.addToLayer(this._mapView.poiLayer);
    },

    _getHotSpot: function() {
        return [Math.floor(this.width / 2), this.height - 3 ];
    },

    _createBubble: function() {
        return new POIBubble.POIBubble({
            place: this.place,
            mapView: this._mapView
        });
    },

    _onMarkerSelected: function() {
        // this._mapView.poiLayer.unselect_all_markers();
        let selectedMarkerList = this._mapView.poiLayer.get_selected();
        selectedMarkerList.forEach(function(marker){
            marker.hideBubble();
        });
        this.showBubble();
    }
});