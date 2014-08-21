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
const GeoMath = imports.geoMath;
const MemoryCache = imports.memoryCache;

const POIMarkerLayer = new Lang.Class({
    Name: 'POIMarkerLayer',
    Extends: Champlain.MarkerLayer,

    _init: function(params) {
        this._mapView = params.mapView;
        delete params.mapView;

        this.parent(params);

        this._initOverpass();
        this._cache = new MemoryCache.MemoryCache({});

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

    getTilesInBBOX: function(bbox) {

        let zoom = this._mapView.view.zoom_level;
        let minX = GeoMath.longitudeToTile(bbox.left, zoom);
        let minY = GeoMath.latitudeToTile(bbox.top, zoom);
        let maxX = GeoMath.longitudeToTile(bbox.right, zoom);
        let maxY = GeoMath.latitudeToTile(bbox.bottom, zoom);

        let tiles = [];
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= minY; y++) {
                tiles.push(new Champlain.Tile({ x: x,
                                                y: y,
                                                zoom_level: zoom,
                                                size: 256 }));
            }
        }

        return tiles;
    },

    clusterPOIsInTiles: function(tiles, pois) {

        let bboxes = tiles.map(GeoMath.bboxFromTile);
        let tilesContent = [];
        for (let i = 0; i < bboxes.length; i++) {
            tilesContent.push([]);
            bboxes[i].left = bboxes[i].left.toFixed(7);
            bboxes[i].right = bboxes[i].right.toFixed(7);
            bboxes[i].top = bboxes[i].top.toFixed(7);
            bboxes[i].bottom = bboxes[i].bottom.toFixed(7);
        }
        let x = 0;
        pois.forEach((function(poi) {
            for (let i = 0; i < bboxes.length; i++) {
                log('--------------------------');
                log(poi.lat + ' , ' + poi.lon);
                log(bboxes[i].left + ' , ' + bboxes[i].right);
                log(bboxes[i].top + ' , ' + bboxes[i].bottom);
                log('--------------------------');
                if (bboxes[i].covers(poi.lat, poi.lon)) {
                    tilesContent[i].push(poi);
                    log(x);
                    break;
                }
            }
            x++;
        }).bind(this));

        let s = 0;
        for (let i = 0; i < tilesContent.length; i++) {
            s += tilesContent[i].length;
        }

        log(s + ' , ' + pois.length);
    },

    _onViewMoved: function() {

        if (this._mapView.view.zoom_level < POI.MIN_DISPLAY_ZOOM_LEVEL)
            return;

        this.remove_all();
        let bbox = this._mapView.view.get_bounding_box();
        this._overpassQuery.send(bbox, (function(pois) {

            let places = pois.map(Overpass.convertJSONPlaceToPOI);
            let tiles = this.getTilesInBBOX(this._mapView.view.get_bounding_box());
            this.clusterPOIsInTiles(tiles, pois);
            places.forEach((function(place) {
                let poiMarker = new POIMarker.POIMarker({ place: place,
                                                          mapView: this._mapView });
                poiMarker.addToLayer(this);
            }).bind(this));

        }).bind(this));
    }
});
