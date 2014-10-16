
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


// Setup event emitter inheritance so that events can be fired/triggered.
var util = require("util"),
	EventEmitter = require("events").EventEmitter;
util.inherits(loader, EventEmitter);


/**
 * Loads the configured room.
 */
loader.prototype.load = function() {
	// TODO: Functional code goes here.

	// Trigger a "loaded" event when completed so bot can be instantiated.
	this.emit("loaded");
};


/**
 * Returns instance of plug.dj internal window (which contains jQuery and document).
 *
 * @returns {object}
 */
loader.prototype.getPlugWin = function() {
	return this.plugWin;
};


// Export module.
module.exports = loader;
