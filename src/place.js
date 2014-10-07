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

const Geocode = imports.gi.GeocodeGlib;
const Gio = imports.gi.Gio;
const Format = imports.format;
const GLib = imports.gi.GLib;

const _ = imports.gettext.gettext;

const _UNKNOWN = 'Unknown';
const _PLACE_DEFAULT_ICON = 'poi-marker';

const placeTypes = {

    'building' : {

    },
    'shop' : {

    },
    'amenity' : {
        'school' : 'poi-school',
        'place_of_worship' : 'poi-place-of-worship',
        'bar' : 'poi-bar',
        'pub' : 'poi-bar',
        'restaurant' : 'poi-restaurant',
        'fast_food' : 'poi-fast-food',
        'bank' : 'poi-bank',
        'atm' : 'poi-bank',
        'clinic' : 'poi-hospital',
        'hospital' : 'poi-hospital',
        'ferry_terminal' : 'poi-ferry',
        'hotel' : 'poi-lodging',
        'library' : 'poi-library',
        'park' : 'poi-park',
        'police' : 'poi-police',
        'theatre' : 'poi-theatre',
    },
    'natural' : {

    },
    'man_made' : {

    },
    'leisure' : {
        'garden' : 'poi-park',
    },
    'historic' : {
        'museum' : 'poi-museum',
    },
    'aeroway' : {
        'aerodrome' : 'poi-airport',
    },
    'place' : {
        'house' : 'poi-building',
        'building' : 'poi-building',
        'residential' : 'poi-building',
        'plaza' : 'poi-building',
        'office' : 'poi-building',
    },
    'railway' : {
        'station' : 'poi-railway-station',
        'subway_entrance' : 'poi-railway-station',
        'subway' : 'poi-railway-station',
        'halt' : 'poi-railway-station',
        'tram_stop': 'poi-railway-station',
    },
    'landuse' : {

    },
    'tourism' : {
        'bed_and_breakfast' : 'poi-restaurant',
        'hostel' : 'poi-lodging',
    },
    'waterway' : {

    },
    'highway' : {
        'bus_stop' : 'poi-bus-stop',
    }
};

/* Information regarding all the keys could be found at:
 * http://taginfo.openstreetmap.org/keys
 */

// Formatter functions
function getBoldText(text) {
    return Format.vprintf('<b>%s</b>', [ GLib.markup_escape_text(text, -1) ]);
}

function getURL(link, title) {
    return Format.vprintf('<a href="%s" title="%s">%s</a>', [ GLib.markup_escape_text(link, -1),
                                                              title,
                                                              getBoldText(title) ]);
}

function getBoldKeyValueString(key, value) {
    return Format.vprintf('%s: %s', [ getBoldText(key),
                                      value ]);
}

// Wikipedia Article Formatter
function getWikipediaLink(tag, value) {
    const WIKI_URL = 'http://www.wikipedia.org/wiki/';

    if (tag === 'wikipedia')
        return getURL(WIKI_URL + value, _('Wikipedia Article'));

    let strings = tag.split(':');
    if (strings[0] === 'wikipedia') {
        value = WIKI_URL + strings[strings.length - 1] + ':' + value || WIKI_URL + value;
        return getURL(value, _('Wikipedia Article'));
    }

    return null;
}

// The tags to be shown to the user
const displayTags = {
    'postal_code':{
        tags: new Set([
            'addr:postcode', 'postal_code'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Postal Code'), value);
        }
    },
    'street':{
        tags: new Set([
            'addr:street', 'addr:street:name', 'addr:streetnumber',
            'naptan:Street', 'osak:street', 'osak:street_no',
            'kms:street_no', 'kms:street_name'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Street'), value);
        }
    },
    'city':{
        tags: new Set([
            'addr:city', 'kms:city_name'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('City'), value);
        }
    },
    'country':{
        tags: new Set([
            'addr:country'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Country'), value);
        }
    },
    'phone':{
        tags: new Set([
            'phone', 'contact:phone'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Phone'), value);
        }
    },
    'fax':{
        tags: new Set([
            'fax', 'contact:fax'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Fax'), value);
        }
    },
    'email':{
        tags: new Set([
            'email', 'contact:email'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Email'), value);
        }
    },
    'website': {
        tags: new Set([
            'website', 'contact:website', 'heritage:website',
            'website2', 'website:official', 'url'
        ]),
        formatter: function(value) {
            return getURL(value, _('Website'));
        }
    },
    'opening_hours':{
        tags: new Set([
            'opening_hours'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Opening Hours'), value);
        }
    },
    'elevation':{
        tags: new Set([
            'ele'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString(_('Elevation'), value);
        }
    },
    'wheelchair':{
        tags: new Set([
            'wheelchair'
        ]),
        formatter: function(value) {
            return getBoldText(_('Wheelchair available'));
        }
    }
};

function getPlaceIconFromTag(key, value) {
    if (key === null || value === null)
        return _PLACE_DEFAULT_ICON;
    return placeTypes[key][value] || _PLACE_DEFAULT_ICON;
}

function getPlaceTypeFromPlaceJSON(place) {
    let key = null;
    let value = null;
    let k = null;
    for (k in placeTypes) {
        if (k in place.tags) {
            key = k;
            break;
        }
    }

    if (key !== null)
        value = place.tags[key];

    return getPlaceIconFromTag(key, value);
}

function newFromOverpass(place) {
    let name = _UNKNOWN;
    if (place.tags)
        name = place.tags.name || _UNKNOWN;

    let location = new Geocode.Location({ latitude:    place.lat,
                                          longitude:   place.lon,
                                          accuracy:    0,
                                          description: name });

    let poi = new Place({ name: name,
                          place_type: Geocode.PlaceType.POINT_OF_INTEREST,
                          location: location,
                          osm_id: place.id.toString(),
                          type: getPlaceTypeFromPlaceJSON(place),
                          tags: place.tags || {} });

    return poi;
}

const Place = new Lang.Class({
    Name: 'Place',
    Extends: Geocode.Place,

    _init: function(params) {
        this._type = params.type || _PLACE_DEFAULT_ICON;
        delete params.type;

        this._tags = params.tags || {};
        delete params.tags;

        this.parent(params);
    },

    get icon() {
        return new Gio.ThemedIcon({ name: this.place_type });
    },

    get place_type() {
        return this._type;
    },

    get tags() {
        return this._tags;
    }
});
