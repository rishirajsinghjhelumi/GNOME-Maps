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

const Champlain = imports.gi.Champlain;

const MapOverlaySource = imports.mapOverlaySource;
const Utils = imports.utils;
const Overpass = imports.overpass;
const GeoMath = imports.geoMath;
const POIRenderer = imports.poiRenderer;

const _FILE_CACHE_NUM = 1e9;
const _MEMORY_CACHE_NUM = 200;
const _MIN_POI_DISPLAY_ZOOM_LEVEL = 16;

function createCachedSource() {

    let sourceChain = new Champlain.MapSourceChain();

    let renderer = new POIRenderer.POIRenderer();
    let fileCacheSource = Champlain.FileCache.new_full(_FILE_CACHE_NUM, null, renderer);
    let memoryCacheSource = Champlain.MemoryCache.new_full(_MEMORY_CACHE_NUM, renderer);

    let poiMapSource = new POIMapSource(renderer);

    sourceChain.push(poiMapSource);
    sourceChain.push(fileCacheSource);
    sourceChain.push(memoryCacheSource);

    return sourceChain;
}

const POIMapSource = new Lang.Class({
    Name: 'POIMapSource',
    Extends: MapOverlaySource.MapOverlaySource,

    _init: function(renderer) {
        this.parent();

        this.renderer = renderer;

        this.overpassQuery = new Overpass.Overpass({});
        this.overpassQuery.addSearchTag("aeroway", "aerodrome");
        this.overpassQuery.addSearchTag("railway", "junction");
        this.overpassQuery.addSearchTag("railway", "switch");
        this.overpassQuery.addSearchTag("railway", "spur");
        this.overpassQuery.addSearchTag("railway", "station");
        this.overpassQuery.addSearchTag("railway", "yard");
        this.overpassQuery.addSearchTag("amenity", "atm");
        this.overpassQuery.addSearchTag("amenity", "bank");
        this.overpassQuery.addSearchTag("amenity", "pub");
        this.overpassQuery.addSearchTag("amenity", "doctors");
        this.overpassQuery.addSearchTag("amenity", "dormitory");
        this.overpassQuery.addSearchTag("amenity", "embassy");
        this.overpassQuery.addSearchTag("amenity", "emergency_phone");
        this.overpassQuery.addSearchTag("amenity", "fast_food");
        this.overpassQuery.addSearchTag("amenity", "restaurant");
        this.overpassQuery.addSearchTag("amenity", "library");
        this.overpassQuery.addSearchTag("amenity", "market");
        this.overpassQuery.addSearchTag("amenity", "marketplace");
        this.overpassQuery.addSearchTag("amenity", "police");
        this.overpassQuery.addSearchTag("amenity", "post_box");
        this.overpassQuery.addSearchTag("amenity", "post_office");
        this.overpassQuery.addSearchTag("amenity", "public_market");
        this.overpassQuery.addSearchTag("amenity", "sauna");
        this.overpassQuery.addSearchTag("amenity", "school");
        this.overpassQuery.addSearchTag("amenity", "shelter");
        this.overpassQuery.addSearchTag("amenity", "shop");
        this.overpassQuery.addSearchTag("amenity", "shopping");
        this.overpassQuery.addSearchTag("amenity", "social_club");
        this.overpassQuery.addSearchTag("amenity", "supermarket");
        this.overpassQuery.addSearchTag("amenity", "swingerclub");
        this.overpassQuery.addSearchTag("amenity", "taxi");
        this.overpassQuery.addSearchTag("amenity", "telephone");
        this.overpassQuery.addSearchTag("amenity", "theatre");
        this.overpassQuery.addSearchTag("amenity", "toilets");
        this.overpassQuery.addSearchTag("amenity", "townhall");
    },

    vfunc_fill_tile: function(tile) {

        if (tile.get_state() === Champlain.State.DONE)
            return;

        if (tile.zoom_level < _MIN_POI_DISPLAY_ZOOM_LEVEL) {
            tile.set_state(Champlain.State.DONE);
            return;
        }

        let bbox = GeoMath.bboxFromTile(tile);
        this.overpassQuery.send(bbox, (function(pois) {

            let data = escape(JSON.stringify(pois));
            this.renderer.set_data(data, data.length);
            this.renderer.render(tile);

        }).bind(this));

        tile.connect('render-complete', (function(tile, data, size, error) {

            if(!error) {
                if(this.cache && tile.data) {
                   this.cache.store_tile(tile, tile.data, tile.data.length);
                }
                tile.set_state(Champlain.State.DONE);
            }
            else if(this.next_source) {
                this.next_source.fill_tile(tile);
            }

        }).bind(this));
    }
});
Utils.addSignalMethods(POIMapSource.prototype);
