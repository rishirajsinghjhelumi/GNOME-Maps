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

const TileMemoryCache = imports.tileMemoryCache;
const TileDBCache = imports.tileDBCache;

const TileCacheChain = new Lang.Class({
    Name: 'CacheChain',

    _init: function(params) {
        this._cacheName = params.cacheName;

        this._memoryCache = new TileMemoryCache.TileMemoryCache({});
        this._DBCache = new TileDBCache.TileDBCache({ tableName: this._cacheName });
    },

    store: function(tile, content) {
        // Cache tile in memory
        this._storeMemory(tile, content);

        // Cache tile in database
        this._storeDB(tile, content);
    },

    get: function(tile) {
        // Load tile from MemoryCache if available
        if (this._memoryCache.isCached(tile)) {
            return this._memoryCache.get(tile)
        }

        // Load tile from DBCache if available and store in memory
        if (this._DBCache.isCached(tile)) {
            let content = JSON.parse(unescape(this._DBCache.get(tile)));
            this._storeMemory(tile, content);
            return content;
        }
        return null;
    },

    isCached: function(tile) {
        // Check if in memory
        if (this._memoryCache.isCached(tile)) {
            return true;
        }

        // Check if in DB
        if (this._DBCache.isCached(tile)) {
            return true;
        }
        return false;
    },

    _storeMemory: function(tile, content) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, (function() {
            this._memoryCache.store(tile, content);
        }).bind(this));
    },

    _storeDB: function(tile, content) {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, (function() {
            this._DBCache.store(tile, escape(JSON.stringify(content)));
        }).bind(this));
    },

    _encodeTileCoordinates: function(tile) {
        return Format.vprintf('%s/%s/%s', [ tile.zoom_level,
                                            tile.x,
                                            tile.y ]);
    }
});