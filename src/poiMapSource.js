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

const Lang = imports.lang;

const Champlain = imports.gi.Champlain;
const Geocode = imports.gi.GeocodeGlib;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;

const MapOverlaySource = imports.mapOverlaySource;
const Utils = imports.utils;
const Overpass = imports.overpass;
const GeoMath = imports.geoMath;

const _POI_ICON_SIZE = 20;

const POIMapSource = new Lang.Class({
    Name: 'POIMapSource',
    Extends: MapOverlaySource.MapOverlaySource,

    _init: function() {
        this.parent();

        this._poiSelectedCallback = function(place) {
            log(place.name);
        };

        this.overpassQuery = new Overpass.Overpass({});
        this.overpassQuery.addSearchTag("aeroway", "aerodrome");
        this.overpassQuery.addSearchTag("railway", "junction");
        this.overpassQuery.addSearchTag("railway", "switch");
        this.overpassQuery.addSearchTag("railway", "spur");
        this.overpassQuery.addSearchTag("railway", "station");
        this.overpassQuery.addSearchTag("railway", "yard");
        this.overpassQuery.addSearchTag("amenity", "atm");
        this.overpassQuery.addSearchTag("amenity", "bank");
        this.overpassQuery.addSearchTag("amenity", "pub");
        this.overpassQuery.addSearchTag("amenity", "doctors");
        this.overpassQuery.addSearchTag("amenity", "dormitory");
        this.overpassQuery.addSearchTag("amenity", "embassy");
        this.overpassQuery.addSearchTag("amenity", "emergency_phone");
        this.overpassQuery.addSearchTag("amenity", "fast_food");
        this.overpassQuery.addSearchTag("amenity", "restaurant");
        this.overpassQuery.addSearchTag("amenity", "library");
        this.overpassQuery.addSearchTag("amenity", "market");
        this.overpassQuery.addSearchTag("amenity", "marketplace");
        this.overpassQuery.addSearchTag("amenity", "police");
        this.overpassQuery.addSearchTag("amenity", "post_box");
        this.overpassQuery.addSearchTag("amenity", "post_office");
        this.overpassQuery.addSearchTag("amenity", "public_market");
        this.overpassQuery.addSearchTag("amenity", "sauna");
        this.overpassQuery.addSearchTag("amenity", "school");
        this.overpassQuery.addSearchTag("amenity", "shelter");
        this.overpassQuery.addSearchTag("amenity", "shop");
        this.overpassQuery.addSearchTag("amenity", "shopping");
        this.overpassQuery.addSearchTag("amenity", "social_club");
        this.overpassQuery.addSearchTag("amenity", "supermarket");
        this.overpassQuery.addSearchTag("amenity", "swingerclub");
        this.overpassQuery.addSearchTag("amenity", "taxi");
        this.overpassQuery.addSearchTag("amenity", "telephone");
        this.overpassQuery.addSearchTag("amenity", "theatre");
        this.overpassQuery.addSearchTag("amenity", "toilets");
        this.overpassQuery.addSearchTag("amenity", "townhall");
    },

    // Maybe this should be in its own render class, a render class that
    // takes a list of places and render their icons?
    _render: function(tile) {
        if (!tile.data)
            return;

        let places = tile.data;
        let actor = new Clutter.Actor();

        places.forEach((function(place) {
            if (!place.icon)
                return;

            Utils.load_icon(place.icon, _POI_ICON_SIZE, (function(pixbuf) {
                let image = new Clutter.Image();
                image.set_data(pixbuf.get_pixels(),
                               Cogl.PixelFormat.RGBA_8888,
                               pixbuf.get_width(),
                               pixbuf.get_height(),
                               pixbuf.get_rowstride());

                let iconMarker = new Champlain.Marker();
                iconMarker.connect('notify::selected', (function() {
                    this._poiSelectedCallback(place);
                }).bind(this));
                iconMarker.set_content(image);
                iconMarker.set_size(pixbuf.get_width(), pixbuf.get_height());
                let tileLat = GeoMath.tileToLatitude(tile.zoom_level, tile.y);
                let tileLon = GeoMath.tileToLongitude(tile.zoom_level, tile.x);
                let location = place.location;
                let x =
                    this.get_x(tile.zoom_level, location.longitude) -
                    this.get_x(tile.zoom_level, tileLon);
                let y =
                    this.get_y(tile.zoom_level, location.latitude) -
                    this.get_y(tile.zoom_level, tileLat);
                iconMarker.set_position(x, y);
                actor.add_child(iconMarker);
            }).bind(this));
        }).bind(this));

        tile.set_content(actor);
        tile.set_fade_in(true);
        tile.set_state(Champlain.State.DONE);
        tile.display_content();
    },

    vfunc_fill_tile: function(tile) {

        if (tile.get_state() === Champlain.State.DONE)
            return;

        if (tile.zoom_level < 15) {
            tile.set_state(Champlain.State.DONE);
            return;
        }

        let bbox = GeoMath.bboxFromTile(tile);
        this.overpassQuery.send(bbox, (function(pois){
            tile.data = pois;
            log("num :: " + pois.length);
            this._render(tile);
        }).bind(this));
    }
});
