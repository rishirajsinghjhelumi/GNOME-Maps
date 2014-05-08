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
const Geocode = imports.gi.GeocodeGlib;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;

const Utils = imports.utils;
const OverpassQueryManager = imports.overpassQueryManager;

const _POI_ICON_SIZE = 20;

const _TILE_SIZE = 256;
const _MAX_ZOOM_LEVEL = 0;
const _MIN_ZOOM_LEVEL = 17;
const _ID = 'maps-poi';
const _NAME = 'GNOME Maps POI';
const _LICENSE = 'tbd';
const _LICENSE_URI = 'tbd';

const POIMapSource = new Lang.Class({
    Name: 'POIMapSource',
    Extends: Champlain.MapSource,

    _init: function() {
        this.parent();

        this._poiSelectedCallback = function(place) {
            log(place.name);
        };
    },

    _sinH: function(arg) {
        return (Math.exp(arg) - Math.exp(-arg)) / 2;
    },

    _tileToLatitude: function(zoom, y) {
        let n = Math.pow(2, zoom);
        let latRad = Math.atan(this._sinH(Math.PI * (1 - 2 * y / n)));
        return latRad * 180.0 / Math.PI;
    },

    _tileToLongitude: function(zoom, x) {
        let n = Math.pow(2, zoom);
        return x / n * 360.0 - 180.0;
    },

    _bboxFromTile: function(tile) {
        return new Geocode.BoundingBox({
            top: this._tileToLatitude(tile.zoom_level, tile.y),
            left: this._tileToLongitude(tile.zoom_level, tile.x),
            bottom: this._tileToLatitude(tile.zoom_level, tile.y + 1),
            right: this._tileToLongitude(tile.zoom_level, tile.x + 1)
        });
    },

    // Maybe this should be in its own render class, a render class that
    // takes a list of places and render their icons?
    _render: function(tile) {
        if (!tile.data)
            return;

        let places = tile.data;
        let actor = new Clutter.Actor();

        places.forEach((function(place) {
            if (!place.icon)
                return;

            Utils.load_icon(place.icon, _POI_ICON_SIZE, (function(pixbuf) {
                let image = new Clutter.Image();
                image.set_data(pixbuf.get_pixels(),
                               Cogl.PixelFormat.RGBA_8888,
                               pixbuf.get_width(),
                               pixbuf.get_height(),
                               pixbuf.get_rowstride());

                let iconMarker = new Champlain.Marker();
                iconMarker.connect('notify::selected', (function() {
                    this._poiSelectedCallback(place);
                }).bind(this));
                iconMarker.set_content(image);
                iconMarker.set_size(pixbuf.get_width(), pixbuf.get_height());
                let tileLat = this._tileToLatitude(tile.zoom_level, tile.y);
                let tileLon = this._tileToLongitude(tile.zoom_level, tile.x);
                let location = place.location;
                let x =
                    this.get_x(tile.zoom_level, location.longitude) -
                    this.get_x(tile.zoom_level, tileLon);
                let y =
                    this.get_y(tile.zoom_level, location.latitude) -
                    this.get_y(tile.zoom_level, tileLat);
                iconMarker.set_position(x, y);
                actor.add_child(iconMarker);
            }).bind(this));
        }).bind(this));

        tile.set_content(actor);
        tile.set_fade_in(true);
        tile.set_state(Champlain.State.DONE);
        tile.display_content();
    },

    vfunc_fill_tile: function(tile) {

        log(tile.zoom_level);

        if (tile.get_state() === Champlain.State.DONE)
            return;

        if (tile.zoom_level < 15) {
            tile.set_state(Champlain.State.DONE);
            return;
        }

        let QM = new OverpassQueryManager.OverpassQueryManager({});
        QM.addSearchPhrase('amenity', 'pub');
        QM.addSearchPhrase('amenity', 'hospital');

        let bbox = this._bboxFromTile(tile);
        QM.setProperty('bbox',{
            'south_lat': bbox.bottom,
            'west_lon': bbox.right,
            'north_lat': bbox.top,
            'east_lon': bbox.left
        });

        let places = QM.fetchPois() || [];
        tile.data = places;
        this._render(tile);

        // let places = [];
        // let forward = Geocode.Forward.new_for_string('[pubs]');
        // forward.search_area = this._bboxFromTile(tile);
        // forward.bounded = true;
        // forward.search_async (null, (function(forward, res) {
        //     try {
        //         places = forward.search_finish(res);
        //     } catch (e) {
        //         tile.set_state(Champlain.State.DONE);
        //         return;
        //     }
        //     tile.data = places;
        //     this._render(tile);
        // }).bind(this));
    },

    vfunc_get_tile_size: function() {
        return _TILE_SIZE;
    },

    vfunc_get_max_zoom_level: function() {
        return _MAX_ZOOM_LEVEL;
    },

    vfunc_get_min_zoom_level: function() {
        return _MIN_ZOOM_LEVEL;
    },

    vfunc_get_id: function() {
        return _ID;
    },

    vfunc_get_name: function() {
        return _NAME;
    },

    vfunc_get_license: function() {
        return _LICENSE;
    },

    vfunc_get_license_uri: function() {
        return _LICENSE_URI;
    }
});
