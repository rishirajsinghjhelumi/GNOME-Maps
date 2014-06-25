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
 * Author: Jonas Danielsson <jonas@threetimestwo.org>
 */

const Lang = imports.lang;

const Champlain = imports.gi.Champlain;

const Utils = imports.utils;
const POI = imports.poi;
const POILocation = imports.poiLocation;

const POIRenderer = new Lang.Class({
	Name: 'POIRenderer',
    Extends: Champlain.Renderer,

    _init: function() {
        this.parent();
    },

    vfunc_set_data: function(data, size) {
        this.data = data;
        this.size = size;
    },

    vfunc_render: function(tile) {

        tile.set_state(Champlain.State.LOADING);

        if (!this.data) {
            tile.emit('render-complete', null, 0, true);
            return;
        }

        let places = JSON.parse(unescape(this.data));
        places = places.map(POI.convertJSONPlaceToPOI);

        places.forEach((function(place) {

            let poiLocation = new POILocation.POILocation(place);
            poiLocation.show();

        }).bind(this));

        tile.data = this.data; // Hack
        tile.emit('render-complete', null, this.data.length, false);
    }
});
Utils.addSignalMethods(POIRenderer.prototype);
