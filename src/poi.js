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

const Signals = imports.signals;
const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;
const Gio = imports.gi.Gio;

const Place = imports.place;

const _UNKNOWN = 'Unknown';

const _POI_DEFAULT_ICON = 'poi-default';
const poiTypes = {

	'building' : {

	},
	'shop' : {

	},
	'amenity' : {
		'school' : 'poi-school',
		'place_of_worship' : 'poi-place-of-worship',
		'bar' : 'poi-bar',
		'pub' : 'poi-bar'
	},
	'natural' : {

	},
	'man_made' : {

	},
	'leisure' : {

	},
	'historic' : {

	},
	'aeroway' : {

	},
	'place' : {

	},
	'railway' : {

	},
	'landuse' : {

	},
	'tourism' : {

	},
	'waterway' : {

	},
	'highway' : {

	}
};

function getPOIIconFromTag(key, value) {
	return poiTypes[key][value] || _POI_DEFAULT_ICON;
}

function getPOITypeFromPlaceJSON(place) {

	let key = null;
    let value = null;

    let k = null;
	for(k in poiTypes) {
		if(k in place.tags)
			key = k;
	}
    value = place.tags[key];

    return Geocode.Place.get_place_type_from_tag(key, value, null);
    // return getPOIIconFromTag(key, value);
}

function convertJSONPlaceToPOI(place) {

    let name = _UNKNOWN;
    if(place.tags)
        name = place.tags.name || _UNKNOWN;

    let location = new Geocode.Location({
        latitude:    place.lat,
        longitude:   place.lon,
        accuracy:    0,
        description: name
    });

    let poi = new POI({
        name: name,
        place_type: getPOITypeFromPlaceJSON(place),
        location: location,
        osm_id: place.id.toString(),
    });

    return poi;
}

const POI = new Lang.Class({
	Name: 'POI',
	Extends: Place.Place,

	_init: function(params) {

		this._type = params.type;
		delete params.type;

		this.parent(params);
	},

	get_icon: function() {
		let icon = this.parent();
		let themedIcon = Gio.ThemedIcon.new("poi-temp");
		log(themedIcon);
		// this.icon = themedIcon;
		return themedIcon;
	},

	get place_type() {
		return this._place_type;
	},

	set place_type(value) {
		this._place_type = value;
	}
});
Signals.addSignalMethods(POI.prototype);