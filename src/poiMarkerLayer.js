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

const Place = imports.place;
const Overpass = imports.overpass;
const POIMarker = imports.poiMarker;
const GeoMath = imports.geoMath;
const TileMemoryCache = imports.tileMemoryCache;

const MIN_POI_DISPLAY_ZOOM_LEVEL = 16;

const POIMarkerLayer = new Lang.Class({
    Name: 'POIMarkerLayer',
    Extends: Champlain.MarkerLayer,

    _init: function(params) {
        this._mapView = params.mapView;
        delete params.mapView;

        this.parent(params);

        this._cache = new TileMemoryCache.TileMemoryCache({});
        this._renderedTiles = {};

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
            this._onViewMoved();
        }).bind(this));
    },

    _clusterPOIsInTiles: function(tiles, pois) {
        let bboxes = tiles.map(GeoMath.bboxFromTile);

        let tilesContent = [];
        for (let i = 0; i < bboxes.length; i++) {
            tilesContent.push([]);
        }

        pois.forEach((function(poi) {
            for (let i = 0; i < bboxes.length; i++) {
                if (bboxes[i].covers(poi.lat, poi.lon)) {
                    tilesContent[i].push(poi);
                    break;
                }
            }
        }).bind(this));

        return tilesContent;
    },

    _allCached: function(tiles) {
        for (let i = 0; i < tiles.length; i++) {
            if (!this._cache.isCached(tiles[i]))
                return false;
        }
        return true;
    },

    _cacheTiles: function(tiles, tilesContent) {
        for (let i = 0; i < tiles.length; i++) {
            if (!this._cache.isCached(tiles[i]))
                this._cache.store(tiles[i], tilesContent[i]);
        }
    },

    _loadTiles: function(tiles) {
        tiles.forEach((function(tile) {
            this._displayContent(tile);
        }).bind(this));
    },

    _displayContent: function(tile) {
        if (this._isRendered(tile))
                return;

        let places = this._cache.get(tile);
        places.forEach((function(place) {
            place = Place.newFromOverpass(place);
            let poiMarker = new POIMarker.POIMarker({ place: place,
                                                      mapView: this._mapView });
            if (this._mapView.view.zoom_level >= MIN_POI_DISPLAY_ZOOM_LEVEL)
                this.add_marker(poiMarker);
        }).bind(this));

        this._setRendered(tile);
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

    _onViewMoved: function() {
        if (this._mapView.view.zoom_level < MIN_POI_DISPLAY_ZOOM_LEVEL)
            return;

        let tiles = this._getVisibleTiles();

        if (this._allCached(tiles)) {
            this._loadTiles(tiles);
            return;
        }

        let bbox = this._mapView.view.get_bounding_box();
        this._overpassQuery.send(bbox, (function(pois) {
            let tilesContent = this._clusterPOIsInTiles(tiles, pois);
            this._cacheTiles(tiles, tilesContent);
            this._loadTiles(tiles);
        }).bind(this));
    },

    _setRendered: function(tile) {
        this._renderedTiles[(tile.get_x() + '/' + tile.get_y())] = true;
    },

    _isRendered: function(tile) {
        return ((tile.get_x() + '/' + tile.get_y()) in this._renderedTiles);
    }
});
