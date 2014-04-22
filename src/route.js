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

const Lang = imports.lang;
const Champlain = imports.gi.Champlain;

const Utils = imports.utils;

const TurnPointType = {
    END:         -3,
    VIA:         -2,
    START:       -1,
    LEFT:         0,
    SHARP_LEFT:   1,
    SLIGHT_LEFT:  2,
    RIGHT:        3,
    SHARP_RIGHT:  4,
    SLIGHT_RIGHT: 5,
    CONTINUE:     6,
    U_TURN:       7,
    ROUNDABOUT:   8
};

const Route = new Lang.Class({
    Name: 'Route',

    _init: function() {
        this.reset();
    },

    update: function({ path, turnPoints, distance, time, bbox }) {
        this.path = path;
        this.turnPoints = turnPoints;
        this.distance = distance;
        this.time = time;
        this.bbox = bbox || this._createBBox(path);
        // TODO: check that the data passed actually means we have a new route
        this.emit('update');
    },

    reset: function() {
        this.path = [];
        this.turnPoints = [];
        this.distance = 0;
        this.time = 0;
        this.bbox = null;
        this.emit('reset');
    },

    _createBBox: function(coordinates) {
        let bbox = new Champlain.BoundingBox();
        coordinates.forEach(function({ latitude, longitude }) {
            bbox.extend(latitude, longitude);
        }, this);
        return bbox;
    }
});
Utils.addSignalMethods(Route.prototype);

const TurnPoint = new Lang.Class({
    Name: 'TurnPoint',

    _init: function({ coordinate, type, direction, distance, instruction }) {
        this.coordinate = coordinate;
        this._type = type;
        this.distance = distance;
        this.instruction = instruction;
    },

    isDestination: function() {
        return this._type === TurnPointType.START
            || this._type === TurnPointType.VIA
            || this._type === TurnPointType.STOP;
    },

    getMarker: function() {
        // TODO: implement (should depend on isDestination above)
        return undefined;
    }
});
