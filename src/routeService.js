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

const Route = imports.route;
const Polyline = imports.polyline;
const HTTP = imports.http;

const Transportation = {
    CAR:     0,
    BIKE:    1,
    FOOT:    2,
    TRANSIT: 3
};

const RouteService = new Lang.Class({
    Name: 'RouteService',
    Abstract: true,

    _init: function() {
        this._session = new Soup.SessionAsync({ user_agent : "gnome-maps" });
    },

    _buildURL: function(viaPoints, transportation) {},

    _parseResult: function(result) {},

    _transportationToString: function() {},

    getRoute: function(viaPoints, transportationType, callback) {
        let url = this._buildURL(viaPoints, transportationType),
            msg = Soup.Message.new('GET', url);
        this._session.queue_message(msg, (function(session, message) {
            if (message.status_code === 200) {
                let result = message.response_body.data;
                callback(this._parseResult(result));
            } else {
                log("Error: " + message.status_code);
                callback(null);
            }
        }).bind(this));
    }
});
