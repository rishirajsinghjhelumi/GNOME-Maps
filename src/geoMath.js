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

const Champlain = imports.gi.Champlain;

Math.sinH = function(arg) {
    return (Math.exp(arg) - Math.exp(-arg)) / 2.0;
}

Math.sec = function(arg) {
    return (1.0 / Math.cos(arg));
}

function tileToLatitude(zoom, y) {
    let n = (1 << zoom) * 1.0;
    let latRad = Math.atan(Math.sinH(Math.PI * (1 - 2 * y / n)));
    return latRad * 180.0 / Math.PI;
}

function tileToLongitude(zoom, x) {
    let n = (1 << zoom) * 1.0;
    return x / n * 360.0 - 180.0;
}

function longitudeToTile(longitude, zoom) {
    let n = (1 << zoom) * 1.0;
    return Math.floor( (longitude + 180.0) / 360.0 * n);
}

function latitudeToTile(latitude, zoom) {
    let n = (1 << zoom) * 1.0;
    let latRad = latitude * Math.PI / 180.0;
    return Math.floor( ( 1 - Math.log( Math.tan(latRad) + Math.sec(latRad) ) / Math.PI ) * 0.5 * n);
}

function bboxFromTile(tile) {
    return new Champlain.BoundingBox({ top: tileToLatitude(tile.zoom_level, tile.y),
                                       left: tileToLongitude(tile.zoom_level, tile.x),
                                       bottom: tileToLatitude(tile.zoom_level, tile.y + 1),
                                       right: tileToLongitude(tile.zoom_level, tile.x + 1) });
}
