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

const Lang = imports.lang;
const Utils = imports.utils;

const Columns = {
    ICON:         0,
    PLACE:        1,
    DESCRIPTION:  2,
};

const PlaceListPopover = new Lang.Class({
    Name: 'PlaceListPopover',
    Extends: Gtk.Popover,

    _init: function(props) {
        this._numVisible = props.num_visible;
        delete props.num_visible;

        this._model = props.model;
        delete props.model;

        let ui = Utils.getUIObject('place-list-popover', ['scrolled-window',
                                                          'stack',
                                                          'spinner',
                                                          'treeview',]);
        this._stack = ui.stack;
        this._scrolledWindow = ui.scrolledWindow;
        this._spinner = ui.spinner;

        this._treeView = ui.treeview;
        this._treeView.model = this._model;
        this._treeView.connect('row-activated',
                               this._onRowActivated.bind(this));
        this._initList();
        this.height_request = this._cellHeight * this._numVisible;
        this._scrolledWindow.set_min_content_height(this.height_request);

        this.parent(props);

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
        let iterValid, iter;

        if (model === null)
            return;

        [iterValid, iter] = model.get_iter(path);
        if (!iterValid)
            return;

        this.emit('selected', model.get_value(iter, Columns.PLACE));
    },

    showSpinner: function() {
        this._spinner.start();
        this._stack.set_visible_child(this._spinner);

        if (!this.get_visible())
            this.show();
    },

    showList: function() {
        if (this._spinner.active)
            this._spinner.stop();

        this._stack.set_visible_child(this._scrolledWindow);

        if (!this.get_visible())
            this.show();

        this._treeView.grab_focus();
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
Utils.addSignalMethods(PlaceListPopover.prototype);
