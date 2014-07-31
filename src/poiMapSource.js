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

const MapOverlaySource = imports.mapOverlaySource;
const Overpass = imports.overpass;
const GeoMath = imports.geoMath;
const POI = imports.poi;
const POIRenderer = imports.poiRenderer;
const Utils = imports.utils;

const _FILE_CACHE_NUM = 1e9;
const _MEMORY_CACHE_NUM = 200;
const _MIN_POI_DISPLAY_ZOOM_LEVEL = 16;

function createCachedSource(mapView) {

    let renderer = new POIRenderer.POIRenderer(mapView);
    let fileCacheSource = Champlain.FileCache.new_full(_FILE_CACHE_NUM, null, renderer);
    let memoryCacheSource = Champlain.MemoryCache.new_full(_MEMORY_CACHE_NUM, renderer);

    let poiMapSource = new POIMapSource(renderer);

    let sourceChain = new Champlain.MapSourceChain();
    sourceChain.push(poiMapSource);
    sourceChain.push(fileCacheSource);
    sourceChain.push(memoryCacheSource);

    return sourceChain;
}

const POIMapSource = new Lang.Class({
    Name: 'POIMapSource',
    Extends: MapOverlaySource.MapOverlaySource,

    _init: function(renderer) {
        this.parent({
            tile_size: 256,
            max_zoom_level: 0,
            min_zoom_level: 17,
            id: 'maps-poi',
            name: 'GNOME Maps POI',
            license: 'Map Data ODBL OpenStreetMap Contributors, Maki Icons Copyright© 2013, Mapbox',
            license_uri: 'http://creativecommons.org/licenses/by-sa/2.0/'
        });

        this.renderer = renderer;
        this.overpassQuery = new Overpass.Overpass({});

        let key = undefined;
        let value = undefined;
        for(key in POI.poiTypes) {
            for(value in POI.poiTypes[key]) {
                this.overpassQuery.addTag(key, value);
            }
        }
    },

    vfunc_fill_tile: function(tile) {

        if (tile.get_state() === Champlain.State.DONE || tile.get_state() === Champlain.State.LOADED)
            return;

        if (tile.zoom_level < _MIN_POI_DISPLAY_ZOOM_LEVEL) {
            tile.set_state(Champlain.State.DONE);
            return;
        }

        let bbox = GeoMath.bboxFromTile(tile);
        this.overpassQuery.send(bbox, (function(pois) {
            let data = Utils.stringToUnicode(JSON.stringify(pois));
            this.renderer.set_data(data, data.length);
            this.renderer.render(tile);
        }).bind(this));

        tile.connect('render-complete', (function(tile, data, size, error) {
            if (!error) {
                if (this.cache && tile.data) {
                   this.cache.store_tile(tile, tile.data, tile.data.length);
                }
                tile.set_state(Champlain.State.DONE);
            }
            else if (this.next_source) {
                this.next_source.fill_tile(tile);
            }
        }).bind(this));
    }
    
});