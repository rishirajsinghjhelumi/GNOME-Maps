/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2013 Mattias Bengtsson.
 *
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
 * Author: Mattias Bengtsson <mattias.jc.bengtsson@gmail.com>
 */

const Soup = imports.gi.Soup;

const Lang = imports.lang;

const Utils = imports.utils;

function encode(obj) {
    let str = Utils.isDefined(obj)
            ? obj.toString()
            : '';
    return Soup.URI.encode(str, null);
}

const Query = new Lang.Class({
    Name: 'HTTPQuery',

    // _query: {},

    _init: function(obj) {
        this._query = {};
        for(let key in obj) {
            this.add(key, obj[key]);
        }
    },

    add: function(key, value) {
        if(typeof this._query[key] === 'undefined') {
            this._query[key] = [];
        }
        if(Utils.isArray(value)) {
            this._query[key] = this._query[key].concat(value);
        }
        else {
            this._query[key].push(value);
        }
    },

    toString: function() {
        let vars = [];
        // log(JSON.stringify(this._query));
        for(let key in this._query) {
            let values = this._query[key];
            let encKey = encode(key);
            values.forEach(function(value) {
                vars.push([encKey, encode(value)].join('='));
            });
        }
        return vars.join('&');
    }
});
