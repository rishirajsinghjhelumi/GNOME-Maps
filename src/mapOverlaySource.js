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

const _TILE_SIZE = 256;
const _MAX_ZOOM_LEVEL = 0;
const _MIN_ZOOM_LEVEL = 17;
const _ID = 'maps-overlay';
const _NAME = 'GNOME Maps Overlay';
const _LICENSE = 'NA';
const _LICENSE_URI = 'NA';

const MapOverlaySource = new Lang.Class({
    Name: 'MapOverlaySource',
    Extends: Champlain.TileSource,
    Abstract: true,

    _init: function(params) {
        this._tile_size = params.tile_size || _TILE_SIZE;
        this._max_zoom_level = params.max_zoom_level || _MAX_ZOOM_LEVEL;
        this._min_zoom_level = params.min_zoom_level || _MIN_ZOOM_LEVEL;
        this._id = params.id || _ID;
        this._name = params.name || _NAME;
        this._license = params.license || _LICENSE;
        this._license_uri = params.license_uri || _LICENSE_URI;
        this.parent();
    },

    vfunc_fill_tile: function(tile) {
        tile.set_state(Champlain.State.DONE);
    },

    vfunc_get_tile_size: function() {
        return this._tile_size;
    },

    vfunc_get_max_zoom_level: function() {
        return this._max_zoom_level;
    },

    vfunc_get_min_zoom_level: function() {
        return this._min_zoom_level;
    },

    vfunc_get_id: function() {
        return this._id;
    },

    vfunc_get_name: function() {
        return this._name;
    },

    vfunc_get_license: function() {
        return this._license;
    },

    vfunc_get_license_uri: function() {
        return this._license_uri;
    }
});