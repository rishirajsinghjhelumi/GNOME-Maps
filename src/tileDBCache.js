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
const Gda = imports.gi.Gda;

const Application = imports.application;

const _DEFAULT_TILE_CACHE_SIZE = 1e9;

const TileDBCache = new Lang.Class({
    Name: 'TileDBCache',

    _init: function(params) {
        this._size = params.cacheSize || _DEFAULT_TILE_CACHE_SIZE;
        this._tableName = params.tableName;

        this._initDB();
    },

    _initDB: function() {
        this._connection = Application.db.connection;
        this._connection.execute_non_select_command(
            Format.vprintf('CREATE TABLE IF NOT EXISTS %s(%s, %s, %s)', 
                [ this._tableName,
                  'tile VARCHAR(64) NOT NULL PRIMARY KEY',
                  'places TEXT',
                  'timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL' ]), null);
    },

    store: function(tile, content) {
        if (typeof content !== 'string')
            throw 'Content type should be string!!!';

        let stmt = new Gda.SqlBuilder({ stmt_type: Gda.SqlStatementType.INSERT });
        stmt.set_table(this._tableName);
        stmt.add_field_value_as_gvalue('tile', this._encodeTileCoordinates(tile));
        stmt.add_field_value_as_gvalue('places', content);
        this._connection.statement_execute_non_select(stmt.get_statement(), null);
    },

    get: function(tile) {
        let query = this._connection.execute_select_command(
            Format.vprintf('SELECT places FROM %s WHERE tile = %s',
                [ this._tableName,
                  this._encodeTileCoordinates(tile) ])
        );

        let iter = query.create_iter();
        iter.move_next();
        return Gda.value_stringify(iter.get_value_for_field('places'));
    },

    isCached: function(tile) {
        let query = this._connection.execute_select_command(
            Format.vprintf('SELECT places FROM %s WHERE tile = %s',
                [ this._tableName,
                  this._encodeTileCoordinates(tile) ])
        );

        return query.get_n_rows() === 0 ? false : true;
    },

    _encodeTileCoordinates: function(tile) {
        return Format.vprintf('%s/%s/%s', [ tile.get_zoom_level(),
                                            tile.get_x(),
                                            tile.get_y() ]);
    }

});
