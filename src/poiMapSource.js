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
const POIRenderer = imports.poiRenderer;

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
            license: 'NA',
            license_uri: 'NA'
        });

        this.renderer = renderer;

        this.overpassQuery = new Overpass.Overpass({});
        this.overpassQuery.addTag("aeroway", "aerodrome");
        this.overpassQuery.addTag("railway", "junction");
        this.overpassQuery.addTag("railway", "switch");
        this.overpassQuery.addTag("railway", "spur");
        this.overpassQuery.addTag("railway", "station");
        this.overpassQuery.addTag("railway", "yard");
        this.overpassQuery.addTag("amenity", "atm");
        this.overpassQuery.addTag("amenity", "bank");
        this.overpassQuery.addTag("amenity", "pub");
        this.overpassQuery.addTag("amenity", "doctors");
        this.overpassQuery.addTag("amenity", "dormitory");
        this.overpassQuery.addTag("amenity", "embassy");
        this.overpassQuery.addTag("amenity", "emergency_phone");
        this.overpassQuery.addTag("amenity", "fast_food");
        this.overpassQuery.addTag("amenity", "restaurant");
        this.overpassQuery.addTag("amenity", "library");
        this.overpassQuery.addTag("amenity", "market");
        this.overpassQuery.addTag("amenity", "marketplace");
        this.overpassQuery.addTag("amenity", "police");
        this.overpassQuery.addTag("amenity", "post_box");
        this.overpassQuery.addTag("amenity", "post_office");
        this.overpassQuery.addTag("amenity", "public_market");
        this.overpassQuery.addTag("amenity", "sauna");
        this.overpassQuery.addTag("amenity", "school");
        this.overpassQuery.addTag("amenity", "shelter");
        this.overpassQuery.addTag("amenity", "shop");
        this.overpassQuery.addTag("amenity", "shopping");
        this.overpassQuery.addTag("amenity", "social_club");
        this.overpassQuery.addTag("amenity", "supermarket");
        this.overpassQuery.addTag("amenity", "swingerclub");
        this.overpassQuery.addTag("amenity", "taxi");
        this.overpassQuery.addTag("amenity", "telephone");
        this.overpassQuery.addTag("amenity", "theatre");
        this.overpassQuery.addTag("amenity", "toilets");
        this.overpassQuery.addTag("amenity", "townhall");
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
            if (!error) {
                if(this.cache && tile.data) {
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