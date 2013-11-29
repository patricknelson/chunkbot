/**
 * ChunkBot: Experimental plug.dj bot.
 *
 * To run, use the following bookmarklet URL in your bookmarks bar:
 * javascript:var ChunkBotURL='http://server/bot.js';$.getScript(ChunkBotURL);
 *
 * Copyright (c) 2013 Patrick Nelson
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html

 * @package	ChunkBot v0.2
 * @author	Patrick Nelson (pat@catchyour.com), a.k.a. chunk_split() on plug.dj
 */


// Run cleanup if bot is being reloaded without full page refresh.
if (typeof ChunkBot != "undefined" && ChunkBot) ChunkBot.cleanUp();

// Define bot functionality.
var ChunkBot = {

	/**
	 * Bot configuration.
	 */
	config: {
		// Please set these options via config.js.
		rateLimit: 1500, // Limits bot output in milliseconds.
		autoAdminStaff: true, // Indicates that staff at manager level or higher are automatically admins of this bot.
		botIdent: "", // What the bot says on startup.
		forceSkip: true, // If songs should be forced to skip after they are finished (must be a moderator).
		outputSongStats: false, // If the bot should log stats about the last song played in the chat room.

		// These things below you shouldn't change in the config at all.
		admins: [], // Array of admin usernames who run admin-only commands. By default, current bot is included. Use addAdmin() to add admins to this list.
		botUser: "", // Automatically setup on init.
		baseURL: "", // Set via ChunkBotURL in BookMarklet when this bot is first pulled in. Needed to load additional files!
		commands: [], // Set via the addCommand() method.
		messageQueue: [], // List of things this bot wants to say.
		messageQueueInterval: null,
		previousOutput: [], // List of things already said -- limited to a small number (prevents self triggering).
		forceSkipInterval: null
	},


	/**
	 * Fetch a local file and execute it.
	 *
	 * @param localFile
	 */
	load: function(localFile, callback) {
		// Fetch file using jQuery relative to current path, as defined in config.
		$.getScript(ChunkBot.config.baseURL + localFile, callback);
	},


	/**
	 * Adds a command to this bot.
	 *
	 * @param config
	 */
	addCommand: function(config) {
		var defaults = {
			text: "",
			title: "",
			hide: false,
			callback: function(data) {}
		};
		var commandConfig = $.extend(defaults, config);

		// Setup a default title if not regex.
		if (commandConfig.title == "" && !(commandConfig.text instanceof RegExp)) commandConfig.title = commandConfig.text;

		// TODO: Ensure command isn't already present before adding to array.

		// Add command to configuration.
		ChunkBot.config.commands.push(commandConfig);

		// Return self to allow chaining if you so desire.
		return ChunkBot;
	},


	/**
	 * Sends something to chat (takes into account rate limit).
	 *
	 * @param text
	 * @param howOften		Use range of 1 - 10 where 1 is rarely and 10 is every time. Default is 10.
	 */
	say: function(text, howOften) {
		// Don't say anything if there's nothing to say.
		if (typeof text == "undefined") return;
		if (text == "") return;

		// Populate an array of random yes/no responses to the question of "how often?" depending on the likelihood given.
		if (typeof howOften == "undefined") howOften = 10;
		var oftenAnswers = [];
		for(i = 1; i <= 10; i++) {
			oftenAnswers.push((howOften > 0 ? 1 : 0));
			howOften--;
		}

		// Track previous output to prevent triggering on it.
		ChunkBot.config.previousOutput.push(ChunkBot.normalizeMessage(text));

		// Determine if we're going to go at it THIS time . . .
		var rand = Math.floor(Math.random() * 10);
		if (oftenAnswers[rand] == 0) return;

		// Add message to queue.
		this.config.messageQueue.push(text);
	},


	/**
	 * Say something random from the array of provided choices.
	 *
	 * @param reponseArray
	 * @param howOften		See the say() method.
	 */
	sayRandom: function(reponseArray, howOften) {
		// Select a random response.
		var randomIndex = Math.floor(Math.random() * reponseArray.length);
		ChunkBot.say(reponseArray[randomIndex], howOften);
	},


	/**
	 * Indicates if this message is in the previous output array.
	 *
	 * @param message
	 * @returns {boolean}
	 */
	hasSaid: function(message) {
		message = ChunkBot.normalizeMessage(message);
		return (ChunkBot.config.previousOutput.indexOf(message) != -1);
	},


	/**
	 * Helps say() and hasSaid() methods.
	 *
	 * @param message
	 * @returns {XML|string}
	 */
	normalizeMessage: function(message) {
		// Convert to lower case.
		message = message.toLowerCase();

		// Remove entities which typically are used for non alphanumeric chars.
		message = message.replace(/&[#0-9a-z]{2,5};/ig, "");

		// Remove non alphanumeric chars.
		message = message.replace(/[^a-z0-9 ]/ig, "");

		return message;
	},


	/**
	 * Returns an array of configured admin users.
	 * @returns {Array}
	 */
	getAdmins: function() {
		// Start off with an array based on manually configured admins.
		var admins = ChunkBot.config.admins;

		// See if we can automatically consider staff admins. If not, return manually configured admins.
		if (!ChunkBot.config.autoAdminStaff) return admins;

		// Hit the API now to get staff members.
		var staff = API.getStaff();
		for (i in staff) {
			var user = staff[i];
			var username = user.username.toLocaleLowerCase();
			if (user.permission >= 3 && admins.indexOf(username) == -1) admins.push(username);
		}

		return admins;
	},


	/**
	 * Indicates if specified username is an admin.
	 *
	 * @param username
	 * @returns {boolean}
	 */
	isAdmin: function(username) {
		// See if user is in the manually coded array of admins.
		var admins = ChunkBot.getAdmins();
		if (admins.indexOf(username.toLowerCase()) != -1) return true;
	},


	/**
	 * Adds specified user to list of admins.
	 *
	 * @param username
	 */
	addAdmin: function(username) {
		if (username == "" || ChunkBot.isAdmin(username)) return; // Don't waste time adding user.
		ChunkBot.config.admins.push(username.toLowerCase());
	},


	/**
	 * Votes on the current song playing. 1 is woot, -1 is meh. Returns true of the vote happened, false otherwise.
	 *
	 * @param direction
	 * @returns {boolean}
	 */
	vote: function(direction) {
		var woot = $("#woot");
		var meh = $("#meh");

		// Determine current vote status.
		var currentDirection = 0;
		if (woot.hasClass("selected")) currentDirection = 1;
		if (meh.hasClass("selected")) currentDirection = -1;

		// Don't do anything if already voted.
		if (currentDirection == direction) return false;

		// Apply vote now.
		if (direction == 1) {
			woot.click();

		} else if (direction == -1) {
			meh.click();
		}

		return true;
	},


	/**
	 * Will enable/disable the the skipping of songs once they have ended.
	 *
	 * @param enabled
	 * @returns {boolean}
	 */
	forceSkip: function(enabled) {
		if (enabled) {
			// Clear existing interval now, if set.
			if (ChunkBot.config.forceSkipInterval) clearInterval(ChunkBot.config.forceSkipInterval);

			// Setup interval which performs the skipping.
			ChunkBot.config.forceSkipInterval = setInterval(ChunkBot.processForceSkip, 1000);

			// See if force skip was already set (for reporting purposes).
			if (ChunkBot.config.forceSkip) return false;

		} else {
			// Remove skip processing.
			clearInterval(ChunkBot.config.forceSkipInterval);
			ChunkBot.config.forceSkipInterval = null;

			// See if force skip was already disabled.
			if (!ChunkBot.config.forceSkip) return false;
		}

		// Update setting.
		ChunkBot.config.forceSkip = enabled;

		return true;
	},


	/**
	 * Actually performs the forced skipping.
	 */
	processForceSkip: function() {
		var remaining = API.getTimeRemaining();
		if (remaining % 30 == 0) console.log("Time remaining: " + remaining + " seconds.");
		if (remaining <= 0) {
			ChunkBot.skip();
			console.log("Skipped song.");
		}
	},


	/**
	 * Skips the currently playing song.
	 */
	skip: function() {
		API.moderateForceSkip();
	},


	/**
	 * Returns an array of objects containing basic song and score info. Returns only the number specified.
	 *
	 * @param number
	 * @returns {Array}
	 */
	last: function(number) {
		var history = API.getHistory();
		var last = [];

		// Get current media "cid" to ensure the first item in our list isn't the current song.
		var currentMedia = API.getMedia();
		var firstMedia = history[0].media;
		if (currentMedia.cid == firstMedia.cid) history.shift();

		number = Math.min(number, 5, history.length);
		for(i = 0; i < number; i++) {
			var item =  history[i];
			var media = item.media;
			var user = item.user;
			var room = item.room;

			last.push({
				user: user.username,
				song: "'" + media.title + "' by '" + media.author + "'",
				woot: room.positive,
				meh: room.negative
			});
		}

		return last;
	},


	/**
	 * Returns a nicely formatted message containing stats on the last [n] number of songs.
	 *
	 * @param number
	 * @returns {string}
	 */
	getStatsMessage: function(number) {
		// Get last song played and it's score.
		var last = ChunkBot.last(number);
		if (last.length == 0) return "";

		// Generate message.
		var messageParts = [];
		for(i in last) {
			var song = last[i];
			var message = song.user + " played " + song.song + " (" + song.woot +  " :+1: / " + song.meh + " :-1:)";
			messageParts.push(message);
		}

		// Generate final message.
		message = messageParts.join(" :zap: ");
		return message;
	},


	/**
	 * Toggles a chat command by emulating receipt of chat message.
	 *
	 * @param message
	 */
	toggle: function(message) {
		ChunkBot.events.CHAT({
			chatID: "",
			from: ChunkBot.config.botUser,
			fromID: "",
			language: "en",
			message: message,
			room: "",
			type: "message"
		});
	},


	/****************************
	 ** INTERNAL FUNCTIONALITY **
	 ****************************/

	/**
	 * Plug.DJ API event handlers.
	 *
	 * NOTE: The event handler names must match the event constants setup under plug's API object (since these are
	 * attached automatically). Easy, breezy, beautiful AUTO-BOT!
	 */
	events: {
		// Receive message from chat.
		CHAT: function(data) {
			// Log message from user in console.
			console.log("[Chat] " + data.from + ": " + data.message);

			// Ensure bot doesn't trigger a command on itself.
			if (ChunkBot.config.botUser == "" && data.message == ChunkBot.config.botIdent) ChunkBot.config.botUser = data.from;

			// See if this exact message is from this user...
			if (data.from == ChunkBot.config.botUser && ChunkBot.hasSaid(data.message)) return;

			// Go through commands to see if a command matches this message and should be triggered.
			for(index in ChunkBot.config.commands) {
				var command = ChunkBot.config.commands[index];
				var found = false;
				var matches = [];

				if (command.text instanceof RegExp) {
					if (command.text.test(data.message)) {
						found = true;
						matches = command.text.exec(data.message);
					}
				} else {
					if (command.text.toLowerCase() == data.message.toLowerCase()) found = true;
				}

				// Run command callback now and break (if found).
				if (found) {
					command.callback(data, matches);
					break;
				}
			}
		},

		// DJ advance.
		DJ_ADVANCE: function(data) {
			console.log("[DJ Advance]");

			// Output stats, if desired.
			if (ChunkBot.config.outputSongStats) {
				var firstStats = ChunkBot.getStatsMessage(1);

				// A really bastardized way of waiting 5 seconds :)
				var delay = 50;
				var maxIterations = 100;
				var numIterations = 0;

				var watchStats = function() {
					var currentStats = ChunkBot.getStatsMessage(1);
					numIterations++;
					if (currentStats != firstStats || numIterations > maxIterations) {
						// Stats have finally changed, so output message now.
						ChunkBot.say(currentStats);
					} else {
						// Wait a little bit longer.
						setTimeout(watchStats, delay);
					}
				};

				// Trigger message to run in a little while to give it time to load.
				setTimeout(watchStats, delay);
			}
		}
	},


	/**
	 * Delegate configured Plug.dj API event hooks to this bot.
	 */
	setupEvents: function() {
		// Remove any existing hooks now.
		ChunkBot.removeEvents();

		// Delegate API event hooks.
		for(event in ChunkBot.events) {
			// Attach fresh hook.
			API.on(API[event], this.events[event]);
		}
	},


	/**
	 * Detaches configured event hooks.
	 */
	removeEvents: function() {
		for(event in ChunkBot.events) {
			// Remove any existing hooks.
			API.off(API[event]);
		}
	},


	/**
	 * Iterates constantly over the current message queue and outputs text, if anything is in the queue.
	 */
	processMessageQueue: function() {
		// Get next message in queue and send it.
		if (ChunkBot.config.messageQueue.length > 0) {
			var text = ChunkBot.config.messageQueue.shift();
			API.sendChat(text);

			// Prune previous output to short list.
			if (ChunkBot.config.previousOutput.length > 4) ChunkBot.config.previousOutput.shift();
		}
	},


	/**
	 * Destroy any previously defined settings if needed to start over clean again (incase reloading without completely
	 * reloading the page).
	 */
	cleanUp: function() {
		clearInterval(ChunkBot.config.messageQueueInterval);
		clearInterval(ChunkBot.config.forceSkipInterval);
		ChunkBot.removeEvents();
	},


	/**
	 * Causes the bot to kill itself.
	 */
	unload: function() {
		console.log("Unloading bot now.");
		ChunkBot.processMessageQueue();
		ChunkBot.cleanUp();
	},


	/**
	 * Initialize bot.
	 */
	init: function() {
		// Attempt to configure base URL based on ChunkBotURL global.
		if (typeof ChunkBotURL != "undefined") {
			urlParts = ChunkBotURL.split("/");
			urlParts.pop();
			this.config.baseURL = urlParts.join("/") + "/";
		}

		// Ensure a base URL has been defined.
		if (this.config.baseURL == "") {
			alert("Cannot load ChunkBot: No base URL has been defined.\n\nPlease set the URL to this bot via 'ChunkButURL' first before initializing.");
			return;
		}

		// Delegate event hooks now.
		this.setupEvents();

		// Determine current username.
		this.config.botUser = API.getUser().username;
		this.addAdmin(ChunkBot.config.botUser);

		// Load separately stored configuration.
		this.load("config.js", function() {
			// Say something in chat to advertise successful load.
			ChunkBot.say(ChunkBot.config.botIdent);
			console.log("Loaded bot configuration:");
			console.log(ChunkBot.config);

			// Initialize the message queue loop.
			ChunkBot.processMessageQueue();
			ChunkBot.config.messageQueueInterval = setInterval(ChunkBot.processMessageQueue, ChunkBot.config.rateLimit);

			// Read config to determine if skipping is enabled by default.
			ChunkBot.forceSkip(ChunkBot.config.forceSkip);
		});
	}
};


// Initialize!
ChunkBot.init();
