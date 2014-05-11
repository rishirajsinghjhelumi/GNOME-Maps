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

const _TILE_SIZE = 256;
const _MAX_ZOOM_LEVEL = 0;
const _MIN_ZOOM_LEVEL = 17;
const _ID = 'maps-poi';
const _NAME = 'GNOME Maps POI';
const _LICENSE = 'tbd';
const _LICENSE_URI = 'tbd';

const MapOverlaySource = new Lang.Class({
	Name: 'MapOverlaySource',
	Extends: Champlain.MapSource,

	_init: function() {
		this.parent();
	},

	vfunc_get_tile_size: function() {
		return _TILE_SIZE;
	},

	vfunc_get_max_zoom_level: function() {
		return _MAX_ZOOM_LEVEL;
	},

	vfunc_get_min_zoom_level: function() {
		return _MIN_ZOOM_LEVEL;
	},

	vfunc_get_id: function() {
		return _ID;
	},

	vfunc_get_name: function() {
		return _NAME;
	},

	vfunc_get_license: function() {
		return _LICENSE;
	},

	vfunc_get_license_uri: function() {
		return _LICENSE_URI;
	}
});