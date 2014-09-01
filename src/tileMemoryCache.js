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
const GLib = imports.gi.GLib;

const Queue = imports.queue;

const _DEFAULT_TILE_CACHE_SIZE = 200;

const TileMemoryCache = new Lang.Class({
    Name: 'TileMemoryCache',

    _init: function(params) {
        this._size = params.cacheSize || _DEFAULT_TILE_CACHE_SIZE;

        this._queue = new Queue.Queue({ maxSize: this._size });
        this._cachedTiles = {};
    },

    store: function(tile, content) {
        this._cachedTiles[this._encodeTileCoordinates(tile)] = content;
        this._queue.enQueue(this._encodeTileCoordinates(tile));
    },

    get: function(tile) {
        this._queue.update(this._encodeTileCoordinates(tile));
        return this._cachedTiles[this._encodeTileCoordinates(tile)];
    },

    isCached: function(tile) {
        return (this._encodeTileCoordinates(tile) in this._cachedTiles);
    },

    clean: function() {
        this._queue.clean();
        this._cachedTiles = {};
    },

    _encodeTileCoordinates: function(tile) {
        return Format.vprintf('%s/%s/%s', [ tile.zoom_level,
                                            tile.x,
                                            tile.y ]);
    }
});
