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

const DB_NAME = 'gnome_maps';
const DB_LOCATION = GLib.get_user_cache_dir() +'/gnome-maps/';

const DB = new Lang.Class({
    Name: 'DB',

    _init: function() {
        this._initDB();
    },

    _initDB: function() {
        GLib.mkdir_with_parents(DB_LOCATION, parseInt('0766', 8));

        this._connection = new Gda.Connection ({
            provider: Gda.Config.get_provider('SQLite'),
            cnc_string: Format.vprintf('DB_DIR=%s;DB_NAME=%s', [ DB_LOCATION,
                                                                 DB_NAME ])
        });
        this._connection.open();
    },

    get connection() {
        return this._connection;
    }
});
