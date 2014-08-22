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
const HTTP = imports.http;
const Utils = imports.utils;

const _UNKNOWN = 'Unknown';
const _PLACE_ICON_SIZE = 48;

/* Information regarding all the keys could be found at:
 * http://taginfo.openstreetmap.org/keys
 */

// The tags that should be not be dislayed to the user
const ignoredTags = new Set([
    'name', 'source', 'access',
    'lanes', 'created_by', 'power',
    'wall', 'surface', 'oneway',
    'ref', 'note', 'maxspeed',
    'layer', 'barrier', 'tracktype',
    'type', 'operator', 'height',
    'admin_level', 'voltage', 'wood',
    'route_ref'
]);

// Ignore codes like 'KSJ2:*', 'osak:*' etc
const ignoredCodes = [
    'source:', 'name:', 'osak:',
    'ngbe:', 'yh:', 'ref:',
    'nhd:', '3dshapes:', 'nycdoitt:',
    'linz:', 'clc:', 'massgis:',
    'canvec:', 'wroclawgis:', 'it:',
    'fhrs:', 'ksj2:'
];

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

function prettifyOSMTag(tag, value) {
    tag = tag.toLowerCase();

    // Don't display these tags
    if (tag in Place.placeTypes)
        return '';

    // Don't display ignored tags
    else if (ignoredTags.has(tag))
        return '';

    // Elevation
    else if (tag === 'ele')
        return getBoldKeyValueString('Elevation', value);

    // Start Date
    else if (tag === 'start_date')
        return getBoldKeyValueString('Started', value);

    // Website
    else if (tag.indexOf('website') > -1 || tag === 'url')
        return getURL(value, 'Website');

    // Email
    else if (tag.indexOf('email') > -1)
        return getBoldKeyValueString('Email', value);

    // Phone
    else if (tag.indexOf('phone') > -1)
        return getBoldKeyValueString('Phone', value);

    // Fax
    else if (tag.indexOf('fax') > -1)
        return getBoldKeyValueString('Fax', value);

    // Wikipedia Articles
    else if (tag.indexOf('wikipedia') > -1) {
        const WIKI_URL = 'http://www.wikipedia.org/wiki/';
        let wikiLink = '<a href="%s" title="Wikipedia Article">Wikipedia Article</a>';
        if (tag === 'wikipedia')
            return getURL(WIKI_URL + value, 'Wikipedia Article');
        let strings = tag.split(':');
        if (strings[0] === 'wikipedia') {
            value = WIKI_URL + strings[strings.length - 1] + ':' + value || WIKI_URL + value;
            return getURL(value, 'Wikipedia Article');
        }
        return '';
    }

    // Don't display notes
    else if (tag.indexOf('note') > -1)
        return '';

    // Don't display tags that have ignored codes
    for (let i = 0; i < ignoredCodes.length; i++) {
        if (tag.indexOf(ignoredCodes[i]) > -1)
            return '';
    }

    // Just return the 'tag: value' string
    return getBoldKeyValueString(tag, value);
}

// Returns the place name if available in tags else Unknows
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
        for (let tag in place.tags) {
            let str = prettifyOSMTag(tag, place.tags[tag]);
            if (str !== '')
                content.push(str);
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
