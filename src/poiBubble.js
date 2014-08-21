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

const MapBubble = imports.mapBubble;
const Place = imports.place;
const Utils = imports.utils;

const _PLACE_ICON_SIZE = 48;

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
        ui.labelTitle.label = place.name;

        let content = [];
        let tag = undefined;
        for (tag in this.place.tags) {
            if (tag in Place.placeTypes || tag === 'name')
                continue;
            content.push(tag + ' = ' + this.place.tags[tag]);
        }

        content.forEach(function(c) {
            let label = new Gtk.Label({ label: c,
                                        visible: true,
                                        halign: Gtk.Align.START });
            ui.boxRight.pack_start(label, false, true, 0);
        });

        this.add(ui.grid);
    }
});
