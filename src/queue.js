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

 const _DEFAULT_QUEUE_SIZE = 1e3;

 const Queue = new Lang.Class({
    Name: 'Queue',

    _init: function(params) {
        this._maxSize = params.maxSize || _DEFAULT_QUEUE_SIZE;
        this._queue = [];
    },

    enqueue: function(data) {
        this._queue.push(data);
        if (this.size() > this._maxSize) {
            this.dequeue();
        }
    },

    dequeue: function() {
        if (this.size() === 0) {
            return null;
        }
        this._queue.splice(0, 1);
    },

    update: function(data) {
        let idx = this._queue.indexOf(data);
        if (idx > -1) {
            this._queue.splice(idx, 1);
        }
        this.enqueue(data);
    },

    front: function() {
        if (this.size() === 0) {
            return null;
        }
        return this._queue[0];
    },

    size: function() {
        return this._queue.length;
    },

    clear: function() {
        this._queue = [];
    }
});
