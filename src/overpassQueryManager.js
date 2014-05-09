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

const Signals = imports.signals;
const Soup = imports.gi.Soup;
const Format = imports.format;
const Geocode = imports.gi.GeocodeGlib;

const _DEFAULT_TIMEOUT = 180;
const _DEFAULT_MAXSIZE = 536870912;
const _DEFAULT_OUTPUT_FORMAT = "json";
const _DEFAULT_OUTPUT_COUNT = 1e6;
const _DEFAULT_OUTPUT_INFO = "body";
const _DEFAULT_OUTPUT_SORT_ORDER = "qt";

const _UNKNOWN = "Unknown";

const BASE_URL = "http://overpass-api.de/api/interpreter";

const OverpassQueryManager = new Lang.Class({
    Name: 'OverpassQueryManager',

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

        // Types of phrases we want to search : pub, school, hospital etc
        this.searchPhrases = [];

        // Area of Search
        this.bbox = null;

        // HTTP Session Variables
        this.session = new Soup.SessionAsync();
        this.session.use_thread_context = true;
    },

    setProperty: function(property, value) {
        this[property] = value;
    },

    getProperty: function(property) {
        return this[property];
    },

    addSearchPhrase: function(key, value){

        // The special phrase supported by OSM can be found at:
        // http://wiki.openstreetmap.org/wiki/Nominatim/Special_Phrases/EN

        this.searchPhrases.push({
            'type': key,
            'value': value
        });
    },

    fetchPois: function(bbox, tile, callback, context) {
        let query = this._generateOverpassQuery(bbox);
        let url = Format.vprintf("%s?data=%s",
            [
                BASE_URL,
                query
            ]);

        let uri = new Soup.URI(url);
        let request = new Soup.Message({method:"GET", uri:uri});
        let session = this.session;

        this.session.queue_message(request, function(session, message) {

            let pois = JSON.parse(message.response_body.data)['elements'] || [];
            for (var i = 0; i < pois.length; i++) {
                pois[i] = this._convertJSONPlaceToGeocodePlace(pois[i]);
            }

            callback(pois, tile, context);

        }.bind(this));

    },

    _generateOverpassQuery: function(bbox) {

        let query = Format.vprintf("%s%s%s%s;(%s);%s;",
            [
                this._getBoundingBoxString(bbox),
                this._getKeyValueString('timeout', this.timeout),
                this._getKeyValueString('out', this.outputFormat),
                this._getKeyValueString('maxsize', this.maxsize),
                this._getPhraseString(),
                this._getOutputString()
            ]);
        return query;
    },

    _getBoundingBoxString: function(bbox) {
        return Format.vprintf("[bbox:%s,%s,%s,%s]",
            [
                bbox.south_lat,
                bbox.west_lon,
                bbox.north_lat,
                bbox.east_lon
            ]);
    },

    _getKeyValueString: function(key, value) {
        return Format.vprintf("[%s:%s]",
            [
                key,
                value
            ]);
    },

    _getPhraseString: function() {

        let phraseString = '';
        this.searchPhrases.forEach(function(phrase){
            phraseString += Format.vprintf('node["%s"="%s"];',
                [
                    phrase.type,
                    phrase.value
                ]);
        });
        return phraseString;
    },

    _getOutputString: function() {
        return Format.vprintf("out %s %s %s",
            [
                this.outputInfo,
                this.outputSortOrder,
                this.outputCount,
            ]);
    },

    _convertJSONPlaceToGeocodePlace: function(place) {

        let location = new Geocode.Location({
            latitude:    place.lat,
            longitude:   place.lon,
            accuracy:    0,
            description: place.id.toString() // PONDER : Whether this should be id or name
                                             // as Geocode has no option for a location id.
                                             // or reverse_gecode this.
        });

        let name = _UNKNOWN;
        if(place.tags)
            name = place.tags.name || _UNKNOWN;

        let geocodePlace = Geocode.Place.new_with_location(
            name,
            Geocode.PlaceType.POINT_OF_INTEREST,
            // TODO : Add against PlaceType
            // Create a data structure which return Place Type for
            // the corresponding place.tags.(amenity | historic | highway ....)
            // Example : "hospital" => "Place.Type.HOSPITAL"
            //           "healthcare" => "Place.Type.HOSPITAL"
            //           "bus_stop" => "Place.Type.BUS_STOP"
            // Add Bugs against the types not in Geocode
            location
        );

        return geocodePlace;
    }

});
Signals.addSignalMethods(OverpassQueryManager.prototype);