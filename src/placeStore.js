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

const Geocode = imports.gi.GeocodeGlib;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Utils = imports.utils;
const Application = imports.application;

const _PLACES_STORE_FILE = 'maps-places.json';
const _ICON_SIZE = 20;

const PlaceType = {
    ANY: -1,
    RECENT: 0,
    FAVORITE: 1
};

const Columns = {
    PLACE_ICON: 0,
    PLACE: 1,
    NAME: 2,
    TYPE: 3,
    ADDED: 4
};

function completionMatchFunc(completion, key, iter) {
    let model = completion.get_model();
    let name = model.get_value(iter, Columns.NAME);

    if (name === null)
        return false;

    name = GLib.utf8_normalize (name, -1, GLib.NormalizeMode.ALL);
    if (name === null)
        return false;

    if (!GLib.ascii_strncasecmp(name, key, key.length))
        return true;
    else
        return false;
}

const PlaceStore = new Lang.Class({
    Name: 'PlaceStore',
    Extends: Gtk.ListStore,

    _init: function() {
        this.recentLimit = Application.settings.get('recent-places-limit');
        this._numRecent = 0;
        this.filename = GLib.build_filenamev([GLib.get_user_data_dir(),
                                              _PLACES_STORE_FILE]);
        this._typeTable = {};

        this.parent();
        this.set_column_types([GdkPixbuf.Pixbuf,
                               GObject.TYPE_OBJECT,
                               GObject.TYPE_STRING,
                               GObject.TYPE_INT,
                               GObject.TYPE_DOUBLE]);

        this.set_sort_column_id(Columns.ADDED, Gtk.SortType.ASCENDING);
    },

    addFavorite: function(place) {
        if (this.exists(place, PlaceType.FAVORITE))
            return;

        if (this.exists(place, PlaceType.RECENT)) {
            this._removeIf((function(model, iter) {
                let p = model.get_value(iter, Columns.PLACE);
                return p.name === place.name;
            }), true);
        }
        this._addPlace(place, PlaceType.FAVORITE, new Date().getTime());
    },

    removePlace: function(place, placeType) {
        if (!this.exists(place, placeType))
            return;

        this._removeIf((function(model, iter) {
            let p = model.get_value(iter, Columns.PLACE);
            if (p.name === place.name) {
                this._typeTable[place.name] = null;
                return true;
            }
            return false;
        }).bind(this), true);
    },

    getModelForPlaceType: function(placeType) {
        let filter = new Gtk.TreeModelFilter({ child_model: this });

        filter.set_visible_func(function(model, iter) {
            let type = model.get_value(iter, Columns.TYPE);
            if (type && type === placeType)
                return true;
            return false;
        });

        return filter;
    },

    addRecent: function(place) {
        if (this.exists(place, PlaceType.RECENT)) {
            this._updateAddTime(place);
            return;
        }

        if (this._numRecent === this.recentLimit) {
            // Since we sort by added, the oldest recent will be
            // the first one we encounter.
            this._removeIf((function(model, iter) {
                let type = model.get_value(iter, Columns.TYPE);

                if (type === PlaceType.RECENT) {
                    let name = model.get_value(iter, Columns.NAME);
                    this._typeTable[name] = null;
                    this._numRecent--;
                    return true;
                }
                return false;
            }).bind(this), true);
        }
        this._addPlace(place, PlaceType.RECENT, new Date().getTime());
        this._numRecent++;
    },

    load: function() {
        if (!GLib.file_test(this.filename, GLib.FileTest.EXISTS))
            return;

        let buffer = Utils.readFile(this.filename);
        if (buffer === null)
            return;

        try {
            let jsonArray = JSON.parse(buffer);
            jsonArray.forEach((function(obj) {
                let location = new Geocode.Location({
                    latitude:    obj.latitude,
                    longitude:   obj.longitude,
                    altitude:    obj.altitude,
                    accuracy:    obj.accuracy,
                    description: obj.name
                });
                let place = Geocode.Place.new_with_location(obj.name,
                                                            obj.place_type,
                                                            location);
                if (obj.bounding_box) {
                    place.set_bounding_box(new Geocode.BoundingBox({
                        top: obj.bounding_box.top,
                        bottom: obj.bounding_box.bottom,
                        left: obj.bounding_box.left,
                        right: obj.bounding_box.right
                    }));
                }
                this._addPlace(place, obj.type, obj.added);
                if (obj.type === PlaceType.RECENT)
                    this._numRecent++;
            }).bind(this));
        } catch (e) {
            throw new Error('failed to parse places file');
        }
    },

    _store: function() {
        let jsonArray = [];
        this.foreach(function(model, path, iter) {
            let place    = model.get_value(iter, Columns.PLACE),
                location = place.location,
                type     = model.get_value(iter, Columns.TYPE),
                added    = model.get_value(iter, Columns.ADDED);

            let bounding_box = null;
            if (place.bounding_box !== null) {
                bounding_box = {
                    top: place.bounding_box.top,
                    bottom: place.bounding_box.bottom,
                    left: place.bounding_box.left,
                    right: place.bounding_box.right
                };
            }

            jsonArray.push({
                place_type:   place.place_type,
                name:         place.name,
                latitude:     location.latitude,
                longitude:    location.longitude,
                altitude:     location.altitude,
                accuracy:     location.accuracy,
                bounding_box: bounding_box,
                type:         type,
                added:        added
            });
        });

        let buffer = JSON.stringify(jsonArray);
        if (!Utils.writeFile(this.filename, buffer))
            log('Failed to write places file!');
    },

    _addPlace: function(place, type, added) {
        let iter = this.append();

        this.set(iter,
                 [Columns.PLACE,
                  Columns.NAME,
                  Columns.TYPE,
                  Columns.ADDED],
                 [place,
                  place.name,
                  type,
                  added]);

        if (place.icon !== null) {
            Utils.load_icon(place.icon, _ICON_SIZE, (function(pixbuf) {
                this.set(iter, [Columns.ICON], [pixbuf]);
            }).bind(this));
        }
        this._typeTable[place.name] = type;
        this._store();
    },

    exists: function(place, type) {
        return this._typeTable[place.name] === type;
    },

    _removeIf: function(evalFunc, stop) {
        this.foreach((function(model, path, iter) {
            if (evalFunc(model, iter)) {
                this.remove(iter);
                if (stop)
                    return true;
            }
            return false;
        }).bind(this));
    },

    _updateAddTime: function(place) {
        this.foreach((function(model, path, iter) {
            let name = model.get_value(iter, Columns.NAME);

            if (name === place.name) {
                let updated = new Date().getTime();
                model.set_value(iter, Columns.ADDED, updated);
                this._store();
                return;
            }
        }).bind(this));
    }
});
