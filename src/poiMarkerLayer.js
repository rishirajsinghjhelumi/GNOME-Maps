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

const POI = imports.poi;
const Overpass = imports.overpass;
const POIMarker = imports.poiMarker;

const POIMarkerLayer = new Lang.Class({
    Name: 'POIMarkerLayer',
    Extends: Champlain.MarkerLayer,

    _init: function(params) {
        this._mapView = params.mapView;
        delete params.mapView;

        this.parent(params);

        this._initOverpass();

        let view = this._mapView.view;
        view.connect('notify::latitude', this._onViewMoved.bind(this));
        view.connect('notify::longitude', this._onViewMoved.bind(this));
    },

    _initOverpass: function() {
        this._overpassQuery = new Overpass.Overpass({});

        let key = undefined;
        let value = undefined;
        for (key in POI.poiTypes) {
            for (value in POI.poiTypes[key]) {
                this._overpassQuery.addTag(key, value);
            }
        }
    },

    _onViewMoved: function() {

        if (this._mapView.view.zoom_level < POI.MIN_DISPLAY_ZOOM_LEVEL)
            return;

        this.remove_all();
        let bbox = this._mapView.view.get_bounding_box();
        this._overpassQuery.send(bbox, (function(pois) {
            let places = pois.map(Overpass.convertJSONPlaceToPOI);
            places.forEach((function(place) {
                let poiMarker = new POIMarker.POIMarker({ place: place,
                                                          mapView: this._mapView });
                poiMarker.addToLayer(this);
            }).bind(this));
        }).bind(this));
    }
});
