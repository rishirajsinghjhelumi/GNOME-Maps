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
const OverpassQueryManager = imports.overpassQueryManager;
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

        this.QM = new OverpassQueryManager.OverpassQueryManager({});
        this.QM.addSearchTag("aeroway", "aerodrome");
        this.QM.addSearchTag("railway", "junction");
        this.QM.addSearchTag("railway", "switch");
        this.QM.addSearchTag("railway", "spur");
        this.QM.addSearchTag("railway", "station");
        this.QM.addSearchTag("railway", "yard");
        this.QM.addSearchTag("amenity", "atm");
        this.QM.addSearchTag("amenity", "bank");
        this.QM.addSearchTag("amenity", "pub");
        this.QM.addSearchTag("amenity", "doctors");
        this.QM.addSearchTag("amenity", "dormitory");
        this.QM.addSearchTag("amenity", "embassy");
        this.QM.addSearchTag("amenity", "emergency_phone");
        this.QM.addSearchTag("amenity", "fast_food");
        this.QM.addSearchTag("amenity", "restaurant");
        this.QM.addSearchTag("amenity", "library");
        this.QM.addSearchTag("amenity", "market");
        this.QM.addSearchTag("amenity", "marketplace");
        this.QM.addSearchTag("amenity", "police");
        this.QM.addSearchTag("amenity", "post_box");
        this.QM.addSearchTag("amenity", "post_office");
        this.QM.addSearchTag("amenity", "public_market");
        this.QM.addSearchTag("amenity", "sauna");
        this.QM.addSearchTag("amenity", "school");
        this.QM.addSearchTag("amenity", "shelter");
        this.QM.addSearchTag("amenity", "shop");
        this.QM.addSearchTag("amenity", "shopping");
        this.QM.addSearchTag("amenity", "social_club");
        this.QM.addSearchTag("amenity", "supermarket");
        this.QM.addSearchTag("amenity", "swingerclub");
        this.QM.addSearchTag("amenity", "taxi");
        this.QM.addSearchTag("amenity", "telephone");
        this.QM.addSearchTag("amenity", "theatre");
        this.QM.addSearchTag("amenity", "toilets");
        this.QM.addSearchTag("amenity", "townhall");
    },

    _bboxFromTile: function(tile) {
        return new Geocode.BoundingBox({
            top: GeoMath.tileToLatitude(tile.zoom_level, tile.y),
            left: GeoMath.tileToLongitude(tile.zoom_level, tile.x),
            bottom: GeoMath.tileToLatitude(tile.zoom_level, tile.y + 1),
            right: GeoMath.tileToLongitude(tile.zoom_level, tile.x + 1)
        });
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

        let bbox = this._bboxFromTile(tile);
        this.QM.fetchPois(bbox, (function(pois){
            tile.data = pois;
            log("num :: " + pois.length);
            this._render(tile);
        }).bind(this));
    }
});
