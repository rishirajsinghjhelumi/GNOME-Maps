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

const Gtk = imports.gi.Gtk;
const Format = imports.format;
const GLib = imports.gi.GLib;

const MapBubble = imports.mapBubble;
const Place = imports.place;
const Utils = imports.utils;

const _UNKNOWN = 'Unknown';
const _PLACE_ICON_SIZE = 48;

/* Information regarding all the keys could be found at:
 * http://taginfo.openstreetmap.org/keys
 */

// The tags to be shown to the user
const displayTags = {
    'postal_code':{
        tags: new Set([
            'addr:postcode', 'postal_code'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Postal Code', value);
        }
    },
    'street':{
        tags: new Set([
            'addr:street', 'addr:street:name', 'addr:streetnumber',
            'naptan:Street', 'osak:street', 'osak:street_no',
            'kms:street_no', 'kms:street_name'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Street', value);
        }
    },
    'city':{
        tags: new Set([
            'addr:city', 'kms:city_name'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('City', value);
        }
    },
    'country':{
        tags: new Set([
            'addr:country'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Country', value);
        }
    },
    'phone':{
        tags: new Set([
            'phone', 'contact:phone'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Phone', value);
        }
    },
    'fax':{
        tags: new Set([
            'fax', 'contact:fax'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Fax', value);
        }
    },
    'email':{
        tags: new Set([
            'email', 'contact:email'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Email', value);
        }
    },
    'website': {
        tags: new Set([
            'website', 'contact:website', 'heritage:website',
            'website2', 'website:official', 'url'
        ]),
        formatter: function(value) {
            return getURL(value, 'Website');
        }
    },
    'opening_hours':{
        tags: new Set([
            'opening_hours'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Opening Hours', value);
        }
    },
    'elevation':{
        tags: new Set([
            'ele'
        ]),
        formatter: function(value) {
            return getBoldKeyValueString('Elevation', value);
        }
    },
    'wheelchair':{
        tags: new Set([
            'wheelchair'
        ]),
        formatter: function(value) {
            return getBoldText('Wheelchair available');
        }
    }
};

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
        return getURL(WIKI_URL + value, 'Wikipedia Article');

    let strings = tag.split(':');
    if (strings[0] === 'wikipedia') {
        value = WIKI_URL + strings[strings.length - 1] + ':' + value || WIKI_URL + value;
        return getURL(value, 'Wikipedia Article');
    }

    return null;
}

function prettifyOSMTag(tag, value) {
    tag = tag.toLowerCase();

    for (let info in displayTags) {
        let tags = displayTags[info].tags;
        let formatter = displayTags[info].formatter;

        if (tags.has(tag)) {
            return formatter(value);
        }
    }

    if (tag.indexOf('wikipedia') > -1) {
        return getWikipediaLink(tag, value);
    }

    return null;
}

// Returns the place name if available in tags else Unknown
function getPlaceNameFromPlace(place) {
    let name = place.name;
    if (name !== _UNKNOWN)
        return name;
    if (place.tags) {
        for (let tag in place.tags) {
            if (tag.indexOf('name:') > -1)
                return place.tags[tag];
        }
    }
    return name;
}

const POIBubble = new Lang.Class({
    Name: 'POIBubble',
    Extends: MapBubble.MapBubble,

    _init: function(params) {
        this.parent(params);

        let ui = Utils.getUIObject('poi-bubble', [ 'grid',
                                                   'box-right',
                                                   'image',
                                                   'label-title' ]);

        let place = this.place;
        Utils.load_icon(place.icon, _PLACE_ICON_SIZE, function(pixbuf) {
            ui.image.pixbuf = pixbuf;
        });
        ui.labelTitle.label = getPlaceNameFromPlace(place);

        let content = [];
        if (place.tags) {
            for (let tag in place.tags) {
                let str = prettifyOSMTag(tag, place.tags[tag]);
                if (str !== null)
                    content.push(str);
            }
        }

        content.forEach(function(c) {
            let label = new Gtk.Label({ visible: true,
                                        halign: Gtk.Align.START,
                                        use_markup: true });
            label.set_markup(c);
            ui.boxRight.pack_start(label, false, true, 0);
        });

        this.add(ui.grid);
    }
});
