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

const Soup = imports.gi.Soup;
const Format = imports.format;
const Geocode = imports.gi.GeocodeGlib;

const POI = imports.poi;

const _DEFAULT_TIMEOUT = 180;
const _DEFAULT_MAXSIZE = 536870912;
const _DEFAULT_OUTPUT_FORMAT = 'json';
const _DEFAULT_OUTPUT_COUNT = 1e6;
const _DEFAULT_OUTPUT_INFO = 'body';
const _DEFAULT_OUTPUT_SORT_ORDER = 'qt';

const _UNKNOWN = 'Unknown';

const BASE_URL = 'http://overpass-api.de/api/interpreter';

function convertJSONPlaceToPOI(place) {
    let name = _UNKNOWN;
    if (place.tags)
        name = place.tags.name || _UNKNOWN;

    let location = new Geocode.Location({ latitude:    place.lat,
                                          longitude:   place.lon,
                                          accuracy:    0,
                                          description: name });

    let poi = new POI.POI({ name: name,
                            place_type: Geocode.PlaceType.POINT_OF_INTEREST,
                            location: location,
                            osm_id: place.id.toString(),
                            type: POI.getPOITypeFromPlaceJSON(place) });

    return poi;
}

const Overpass = new Lang.Class({
    Name: 'Overpass',

    _init: function(params) {

        // maximum allowed runtime for the query in seconds
        this.timeout = params.timeout || _DEFAULT_TIMEOUT;

        //  maximum allowed memory for the query in bytes RAM on the server
        this.maxsize = params.maxsize || _DEFAULT_MAXSIZE;

        // output format : json or xml
        this.outputFormat = params.outputFormat || _DEFAULT_OUTPUT_FORMAT;

        // maximum number of results the output must contain
        this.outputCount = params.outputCount || _DEFAULT_OUTPUT_COUNT;

        // data output info must contain : ids, skel, body, meta
        this.outputInfo = params.outputInfo || _DEFAULT_OUTPUT_INFO;

        // data sort order : qt(fastest based on geography), ids, asc
        this.outputSortOrder = params.outputSortOrder || _DEFAULT_OUTPUT_SORT_ORDER;

        // Types of Tags we want to search : pub, school, hospital etc
        this.searchTags = [];

        // HTTP Session Variables
        this._session = new Soup.Session();
    },

    addTag: function(key, value) {
        this.searchTags.push({ 'key': key,
                               'value': value });
    },

    send: function(bbox, callback) {
        let url = this._getQueryUrl(bbox);
        let uri = new Soup.URI(url);
        let request = new Soup.Message({ method: 'GET',
                                         uri: uri });

        this._session.queue_message(request, (function(obj, message) {
            if (message.status_code !== Soup.KnownStatusCode.OK) {
                callback([]);
                return;
            }

            try {
                callback(JSON.parse(message.response_body.data)['elements']);
            } catch(e) {
                callback([]);
            }
        }).bind(this));
    },

    _getQueryUrl: function(bbox) {
        return Format.vprintf('%s?data=%s', [ BASE_URL,
                                              this._generateOverpassQuery(bbox) ]);
    },

    _generateOverpassQuery: function(bbox) {
        return Format.vprintf('%s%s%s%s;(%s);%s;', [ this._getBoundingBoxString(bbox),
                                                     this._getKeyValueString('timeout', this.timeout),
                                                     this._getKeyValueString('out', this.outputFormat),
                                                     this._getKeyValueString('maxsize', this.maxsize),
                                                     this._getTagString(),
                                                     this._getOutputString() ]);
    },

    _getBoundingBoxString: function(bbox) {
        return Format.vprintf('[bbox:%s,%s,%s,%s]', [ bbox.bottom,
                                                      bbox.left,
                                                      bbox.top,
                                                      bbox.right ]);
    },

    _getKeyValueString: function(key, value) {
        return Format.vprintf('[%s:%s]', [ key,
                                           value ]);
    },

    _getTagString: function() {
        let tagString = '';
        this.searchTags.forEach(function(tag) {
            tagString += Format.vprintf('node[%s=%s];', [ tag.key,
                                                          tag.value ]);
        });
        return tagString;
    },

    _getOutputString: function() {
        return Format.vprintf('out %s %s %s', [ this.outputInfo,
                                                this.outputSortOrder,
                                                this.outputCount ]);
    }
});
