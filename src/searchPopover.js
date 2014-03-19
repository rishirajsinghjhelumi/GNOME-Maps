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

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GObject = imports.gi.GObject;

const Lang = imports.lang;
const Utils = imports.utils;

const PlacePopover = imports.placePopover;

const _PLACE_ICON_SIZE = 20;
const _ITEMS_VISIBLE = 10;

const SearchPopover = new Lang.Class({
    Name: 'SearchPopover',
    Extends: PlacePopover.PlacePopover,

    _init: function(relativeTo) {
        this.parent(relativeTo, _ITEMS_VISIBLE);
    },

    updateResult: function(places, searchString) {
        let model = this._treeView.get_model();

        model.clear();

        places.forEach((function(place) {
            if (!place.location)
                return;

            let iter = model.append();
            let location = place.get_location();
            let icon = place.icon;

            let description = GLib.markup_escape_text(location.description, -1);
            description = this._boldMatch(description, searchString);

            model.set(iter,
                      [PlacePopover.Columns.PLACE,
                        PlacePopover.Columns.DESCRIPTION],
                      [place,
                       description]);

            if (icon !== null) {
                Utils.load_icon(icon, _PLACE_ICON_SIZE, function(pixbuf) {
                    model.set(iter, [PlacePopover.Columns.ICON], [pixbuf]);
                });
            }
        }).bind(this));
    },

    showSpinner: function() {
        this._spinner.start();
        this._stack.set_visible_child(this._spinner);

        if (!this.get_visible())
            this.show();
    },

    showResult: function() {
        if (this._spinner.active)
            this._spinner.stop();

        this._stack.set_visible_child(this._scrolledWindow);

        if (!this.get_visible())
            this.show();

        this._treeView.grab_focus();
    },

    _boldMatch: function(description, searchString) {
        searchString = searchString.toLowerCase();

        let index = description.toLowerCase().indexOf(searchString);

        if (index !== -1) {
            let substring = description.substring(index,
                                                  index + searchString.length);
            description = description.replace(substring, substring.bold());
        }
        return description;
    }
});
