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
const Gtk = imports.gi.Gtk;

const MapBubble = imports.mapBubble;
const Utils = imports.utils;
const _ = imports.gettext.gettext;

const _PLACE_ICON_SIZE = 48;

const POIBubble = new Lang.Class({
    Name: 'POIBubble',
    Extends: MapBubble.MapBubble,

    _init: function(params) {
        this.parent(params);

        let ui = Utils.getUIObject('poi-bubble', [  'box',
                                                    'box-right',
                                                    'image',
                                                    'label-title' ]);

        let place = this.place;

        Utils.load_icon(place.get_icon(), _PLACE_ICON_SIZE, function(pixbuf) {
            ui.image.pixbuf = pixbuf;
        });

        let title = null;
        let content = [];

        switch (place.place_type) {
            case Geocode.PlaceType.COUNTRY:
                title = place.country;
                if (place.country_code)
                    content.push(_("Country code: %s").format(place.country_code));
                break;

            case Geocode.PlaceType.TOWN:
                title = place.town;
                if (place.postal_code)
                    content.push(_("Postal code: %s").format(place.postal_code));
                content.push(place.state + ', ' + place.country);
                break;

            //TODO: add specific UIs for the rest of the place types
            default:
                title = place.name;
                break;
        }

        ui.labelTitle.label = title;

        for (let i in content) {
            if (content[i]) {
                let label = new Gtk.Label({
                    label: content[i],
                    halign: Gtk.Align.START
                });
                ui.boxRight.pack_start(label, false, true, 0);
            }
        }

        this.add(ui.box);
    }
});