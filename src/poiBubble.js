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
    'source:', 'ksj2:', 'osak:',
    'ngbe:', 'yh:', 'ref:',
    'nhd:', '3dshapes:', 'nycdoitt:',
    'linz:', 'clc:', 'massgis:',
    'canvec:', 'wroclawgis:', 'it:',
    'fhrs:'
];

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
        return Format.vprintf('Elevation: %s', [ value ]);

    // Start Date
    else if (tag === 'start_date')
        return Format.vprintf('Started: %s', [ value ]);

    // Website
    else if (tag.indexOf('website') > -1 || tag === 'url')
        return GLib.markup_escape_text(Format.vprintf('<a href="%s">Website</a>', [ value ]), -1);

    // Email
    else if (tag.indexOf('email') > -1)
        return Format.vprintf('Email: %s', [ value ]);

    // Phone
    else if (tag.indexOf('phone') > -1)
        return Format.vprintf('Phone: %s', [ value ]);

    // Fax
    else if (tag.indexOf('fax') > -1)
        return Format.vprintf('Fax: %s', [ value ]);

    // Wikipedia Articles
    else if (tag.indexOf('wikipedia') > -1) {
        const WIKI_URL = 'http://www.wikipedia.org/wiki/';
        let wikiLink = '<a href="%s">Wikipedia Article</a>';
        if (tag === 'wikipedia')
            return GLib.markup_escape_text(Format.vprintf(wikiLink, [ WIKI_URL + value ]), -1);
        let strings = tag.split(':');
        if (strings[0] === 'wikipedia') {
            value = WIKI_URL + strings[strings.length - 1] + ':' + value || WIKI_URL + value;
            return GLib.markup_escape_text(Format.vprintf(wikiLink, [ value ]), -1);
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

    // Just return the 'tag => value' string
    return tag + ' => ' + value;
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
            let label = new Gtk.Label({ label: c,
                                        visible: true,
                                        halign: Gtk.Align.START });
            label.set_markup(true);
            ui.boxRight.pack_start(label, false, true, 0);
        });

        this.add(ui.grid);
    }
});
