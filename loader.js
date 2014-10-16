
// TODO: Under construction.
// TODO: A majority of the contents of index.js will be moved here.


/**
 * Instantiate a new room loader using the provided email/password credentials. Call the "load()" method load the room.
 * When loaded successfully, the "loaded" event will be fired.
 *
 * @param roomURL
 * @param email
 * @param password
 */
var loader = function(roomURL, email, password) {
	this.roomURL = roomURL;
	this.email = email;
	this.password = password;
	this.plugWin = null;
};

loader.prototype = {
	/**
	 * Loads the configured room .
	 */
	load: function() {
		// TODO: Functional code goes here.

		// TODO: Trigger a "loaded" event when completed so bot can be instantiated.
	},

	/**
	 * Returns instance of plug.dj internal window (which contains jQuery and document).
	 *
	 * @returns {object}
	 */
	getPlugWin: function() {
		return this.plugWin;
	}
};


// Setup event emitter inheritance so that events can be fired/triggered.
var util = require("util"),
	EventEmitter = require("events").EventEmitter;
util.inherits(loader, EventEmitter);


// Export module.
module.exports = loader;
