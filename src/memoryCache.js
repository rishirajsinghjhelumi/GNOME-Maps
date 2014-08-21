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

const Format = imports.format;

const Champlain = imports.gi.Champlain;

const _NUM_CACHE = 200;

const MemoryCache = new Lang.Class({
    Name: 'MemoryCache',

    _init: function(params) {
    	this._numCache = params.numCache || _NUM_CACHE;

    	this._cachedTiles = {};
    },

    store: function(tile, content) {
    	this._cachedTiles[this._encodeTileCoordinates(tile)] = content;
    },

    get: function(tile) {
    	return this._cachedTiles[this._encodeTileCoordinates(tile)];
    },

    isCached: function(tile) {
    	return (this._encodeTileCoordinates(tile) in this._cachedTiles);
    },

    clean: function() {
    	this._cachedTiles = {};
    },

    _encodeTileCoordinates: function(tile) {
    	return Format.vprintf('%s/%s/%s', [ tile.get_zoom_level(),
    										tile.get_x(),
    										tile.get_y() ]);
    },

    _decodeTileCoordinates: function(str) {
    	let res = str.split('/');
    	return { x: res[0],
    			 y: res[1],
    			 zoom: res[2] };
    }
});
