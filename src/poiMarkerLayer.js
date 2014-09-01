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

const GLib = imports.gi.GLib;

const Champlain = imports.gi.Champlain;

const Place = imports.place;
const Overpass = imports.overpass;
const POIMarker = imports.poiMarker;
const GeoMath = imports.geoMath;
const TileMemoryCache = imports.tileMemoryCache;
const TileDBCache = imports.tileDBCache;
const Utils = imports.utils;

const MIN_POI_DISPLAY_ZOOM_LEVEL = 16;

const POIMarkerLayer = new Lang.Class({
    Name: 'POIMarkerLayer',
    Extends: Champlain.MarkerLayer,

    _init: function(params) {
        this._mapView = params.mapView;
        delete params.mapView;

        this.parent(params);

        this._memoryCache = new TileMemoryCache.TileMemoryCache({});
        this._DBCache = new TileDBCache.TileDBCache({ tableName: 'poi_cache' });
        this._renderedTiles = {};
        this._queries = {};

        this._initOverpass();
        this._initSignals();
    },

    _initOverpass: function() {
        this._overpassQuery = new Overpass.Overpass({});

        let key = undefined;
        let value = undefined;
        for (key in Place.placeTypes) {
            for (value in Place.placeTypes[key]) {
                this._overpassQuery.addTag(key, value);
            }
        }
    },

    _initSignals: function() {
        let view = this._mapView.view;

        view.connect('notify::latitude', this._onViewMoved.bind(this));
        view.connect('notify::longitude', this._onViewMoved.bind(this));

        view.connect('notify::zoom-level', (function() {
            this._renderedTiles = {};
            this.remove_all();
        }).bind(this));
    },

    _getVisibleTiles: function() {
        let view = this._mapView.view;
        let zoom = view.zoom_level;
        let source = view.get_map_source();
        let bbox = view.get_bounding_box();
        let size = source.get_tile_size();

        let minX = Math.floor(source.get_x(zoom, bbox.left) / size);
        let minY = Math.floor(source.get_y(zoom, bbox.top) / size);
        let maxX = Math.floor(source.get_x(zoom, bbox.right) / size);
        let maxY = Math.floor(source.get_y(zoom, bbox.bottom) / size);

        let tiles = [];
        for (let x = minX; x <= maxX ; x++) {
            for (let y = minY; y <= maxY; y++) {
                tiles.push(new Champlain.Tile({ x: x,
                                                y: y,
                                                zoom_level: zoom,
                                                size: size }));
            }
        }

        return tiles;
    },

    _loadTile: function(tile) {
        // Check if rendered
        if (this._isRendered(tile))
            return;

        // Check if already queried for tile
        if (this._isQueried(tile))
            return;

        // Load tile from MemoryCache if available
        if (this._memoryCache.isCached(tile)) {
            this._displayTile(this._memoryCache.get(tile));
            this._setRendered(tile);
            return;
        }

        // Load tile from DBCache if available
        if (this._DBCache.isCached(tile)) {
            this._displayTile(JSON.parse(unescape(this._DBCache.get(tile))));
            this._setRendered(tile);
            return;
        }

        // Load tile from Server
        let bbox = GeoMath.bboxFromTile(tile);
        this._setQueried(tile);
        this._overpassQuery.send(bbox, (function(pois) {
            this._removeQuery(tile);

            // Cache tile in memory
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, (function() {
                this._memoryCache.store(tile, pois);
            }).bind(this));

            // Cache tile in database
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, (function() {
                this._DBCache.store( tile, escape(JSON.stringify(pois)));
            }).bind(this));

            this._displayTile(pois);
            this._setRendered(tile);
        }).bind(this));
    },

    _displayTile: function(places) {
        places.forEach((function(place) {
            let poiMarker = new POIMarker.POIMarker({ place: Place.newFromOverpass(place),
                                                      mapView: this._mapView });
            if (this._mapView.view.zoom_level >= MIN_POI_DISPLAY_ZOOM_LEVEL)
                this.add_marker(poiMarker);
        }).bind(this));
    },

    _onViewMoved: function() {
        if (this._mapView.view.zoom_level < MIN_POI_DISPLAY_ZOOM_LEVEL)
            return;

        let tiles = this._getVisibleTiles();
        tiles.forEach((function(tile) {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, (function() {
                this._loadTile(tile);
            }).bind(this));
        }).bind(this));
    },

    _setRendered: function(tile) {
        let count = 1 << this._mapView.view.zoom_level;
        this._renderedTiles[tile.y * count + tile.x] = true;
    },

    _isRendered: function(tile) {
        let count = 1 << this._mapView.view.zoom_level;
        return ((tile.y * count + tile.x) in this._renderedTiles);
    },

    _setQueried: function(tile) {
        let count = 1 << this._mapView.view.zoom_level;
        this._queries[tile.y * count + tile.x] = true;
    },

    _removeQuery: function(tile) {
        let count = 1 << this._mapView.view.zoom_level;
        delete this._queries[tile.y * count + tile.x];
    },

    _isQueried: function(tile) {
        let count = 1 << this._mapView.view.zoom_level;
        return ((tile.y * count + tile.x) in this._queries);  
    }
});
