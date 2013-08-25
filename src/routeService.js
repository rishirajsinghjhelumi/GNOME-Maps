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
const Champlain = imports.gi.Champlain;
const GObject = imports.gi.GObject;
const GeoCode = imports.gi.GeocodeGlib;

const Lang = imports.lang;
const Utils = imports.utils;

const Route = imports.route;
const EPAF = imports.epaf;
const HTTP = imports.http;

const Transportation = {
    CAR:        0,
    BIKE:       1,
    PEDESTRIAN: 2,
    TRANSIT:    3
};

const Query = new Lang.Class({
    Name: 'Query',
    Extends: GObject.Object,
    Properties: {
        'from': GObject.ParamSpec.object('from',
                                         '',
                                         '',
                                         GObject.ParamFlags.READABLE |
                                         GObject.ParamFlags.WRITABLE,
                                         GeoCode.Place),
        'to': GObject.ParamSpec.object('to',
                                       '',
                                       '',
                                       GObject.ParamFlags.READABLE |
                                       GObject.ParamFlags.WRITABLE,
                                       GeoCode.Place),
        'transportation': GObject.ParamSpec.int('transportation',
                                                '',
                                                '',
                                                GObject.ParamFlags.READABLE |
                                                GObject.ParamFlags.WRITABLE,
                                                Transportation.CAR, Transportation.TRANSIT,
                                                Transportation.CAR)
    },

    _init: function(args) {
        this.parent(args);
        this._changeSignalId = this.connect('notify', this.emit.bind(this, 'change'));
        this.reset();
    },

    reset: function() {
        this.setMany({ from: null,
                       to: null,
                       transportation: Transportation.CAR });
    },

    setMany: function(obj) {
        this.disconnect(this._changeSignalId);

        if(obj.hasOwnProperty("from"))
            this.from = obj.from;
        if(obj.hasOwnProperty("to"))
            this.to = obj.to;
        if(obj.hasOwnProperty("transportation"))
            this.transportation = obj.transportation;
        
        this._changeSignalId = this.connect('notify', this.emit.bind(this, 'change'));
        this.emit('change');
    },
    
    toString: function() {
        return "From: " + this.from +
            "\nTo: " + this.to +
            "\nTransportation" + this.transportation;
    }
});
Utils.addSignalMethods(Query.prototype);

/*
 * TODO: 
 *  - remove this abstract class
 *  - error handling
 */      
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
                callback(undefined, this._parseResult(result));
            } else {
                callback("Error: " + message.status_code);
            }
        }).bind(this));
    }
});

const GraphHopper = new Lang.Class({
    Name: 'GraphHopper',
    Extends: RouteService,

    _init: function(url) {
        this._key = "VCIHrHj0pDKb8INLpT4s5hVadNmJ1Q3vi0J4nJYP";
        this._baseURL = url || "http://graphhopper.com/api/1/route?";
        this._locale = 'en_US'; // TODO: get this from env
        this.parent();
    },

    _vehicle: function(transportationType) {
        switch(transportationType) {
            case Transportation.CAR:        return 'car';
            case Transportation.BIKE:       return 'bike';
            case Transportation.PEDESTRIAN: return 'foot';
            default:                        return null;
        }
    },

    _buildURL: function(viaPoints, transportation) {
        let points = viaPoints.map(function(p) {
            return [p.latitude, p.longitude].join(',');
        });

        let query = new HTTP.Query({ type: 'json',
                                     key: this._key,
                                     vehicle: this._vehicle(transportation),
                                     locale: this._locale,
                                     point: points
                                   });
        let url = this._baseURL + query.toString();
        Utils.debug("Sending route request to: " + url);
        return url;
    },

    // TODO: error handling
    _parseResult: function(result) {
        // Always the first path until GH has alternate routes support
        let route = JSON.parse(result).paths[0],
            path = EPAF.decode(route.points),
            turnPoints = this._createTurnPoints(path, route.instructions),
            bbox = new Champlain.BoundingBox();

        // GH does lonlat-order and Champlain latlon-order
        bbox.extend(route.bbox[1], route.bbox[0]);
        bbox.extend(route.bbox[3], route.bbox[2]);

        return { path:        path,
                 turnPoints:  turnPoints,
                 distance:    route.distance,
                 time:        route.time,
                 bbox:        bbox };
    },

    _createTurnPoints: function(path, instructions) {
        let startPoint = new Route.TurnPoint({ coordinate:  path[0],
                                               type:        Route.TurnPointType.START,
                                               distance:    0,
                                               instruction: "Start!", // localize
                                               time:        0
                                             }),
            rest = instructions.map(this._createTurnPoint.bind(this, path));
        return [startPoint].concat(rest);
    },

    _createTurnPoint: function(path, { text, distance, time, interval, sign }) {
        return new Route.TurnPoint({ coordinate:  path[interval[0]],
                                     type:        this._createType(sign),
                                     distance:    distance,
                                     instruction: text,
                                     time:        time });
    },

    _createType: function(sign) {
        switch(sign) {
        case -3: return Route.TurnPointType.SHARP_LEFT;
        case -2: return Route.TurnPointType.LEFT;
        case -1: return Route.TurnPointType.SLIGHT_LEFT;
        case  0: return Route.TurnPointType.CONTINUE;
        case  1: return Route.TurnPointType.SLIGHT_RIGHT;
        case  2: return Route.TurnPointType.RIGHT;
        case  3: return Route.TurnPointType.SHARP_RIGHT;
        case  4: return Route.TurnPointType.END;
        case  5: return Route.TurnPointType.VIA;
        default: return null;
        };
    }
});
