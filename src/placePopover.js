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

const Columns = {
    ICON:         0,
    PLACE:        1,
    DESCRIPTION:  2
};

const PlacePopover = new Lang.Class({
    Name: 'PlacePopover',
    Extends: Gtk.Popover,
    Abstract: true,

    _init: function(relativeTo,numVisible) {
        this._numVisible = numVisible;

        let ui = Utils.getUIObject('place-popover', ['scrolled-window',
                                                     'stack',
                                                     'spinner',
                                                     'treeview',]);

        this._stack = ui.stack;
        this._scrolledWindow = ui.scrolledWindow;
        this._spinner = ui.spinner;
        this._treeView = ui.treeview;

        let model = new Gtk.ListStore();
        model.set_column_types([GdkPixbuf.Pixbuf,
                                GObject.TYPE_OBJECT,
                                GObject.TYPE_STRING]);
        this._treeView.model = model;

        this._treeView.connect('row-activated',
                               this._onRowActivated.bind(this));
        this._initList();
        this.height_request = this._cellHeight * this._numVisible;
        this._scrolledWindow.set_min_content_height(this.height_request);

        this.parent({ relative_to: relativeTo,
                      width_request: 500,
                      no_show_all: true,
                      visible: true });

        this.get_style_context().add_class('maps-popover');
        this.add(this._stack);
        this.hide();
    },

    _initList: function() {
        let column = new Gtk.TreeViewColumn();

        this._treeView.append_column(column);

        let cell = new Gtk.CellRendererPixbuf({ xpad: 2 });
        column.pack_start(cell, false);
        column.add_attribute(cell, 'pixbuf', Columns.ICON);

        cell = new Gtk.CellRendererText({ xpad: 8,
                                          ypad: 8 });
        column.pack_start(cell, true);
        column.add_attribute(cell, 'markup', Columns.DESCRIPTION);

        this._cellHeight = column.cell_get_size(null)[3];
        this._cellHeight += cell.get_preferred_height(this._treeView)[0];
    },

    _onRowActivated: function(widget, path, column) {
        let model = this._treeView.model;
        let iter_valid, iter;

        if (model === null)
            return;

        [iter_valid, iter] = model.get_iter(path);
        if (!iter_valid)
            return;

        this.emit('selected', model.get_value(iter, Columns.PLACE), this);
    },

    vfunc_show: function() {
        this._treeView.columns_autosize();
        this.parent();
    },

    vfunc_hide: function() {
        if (this._spinner.active)
            this._spinner.stop();

        this.parent();
    },
});
Utils.addSignalMethods(PlacePopover.prototype);
