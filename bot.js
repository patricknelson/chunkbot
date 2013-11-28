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

 * @package	ChunkBot v0.1
 * @author	Patrick Nelson (pat@catchyour.com), a.k.a. chunk_split() on plug.dj
 */


// Run cleanup if bot is being reloaded without full page refresh.
if (typeof ChunkBot != "undefined") ChunkBot.cleanUp();

// Define bot functionality.
var ChunkBot = {

	/**
	 * Bot configuration.
	 */
	config: {
		// Boilerplate configuration. Everything else, please set via config.js.
		baseURL: "",
		rateLimit: 1500, // Limits bot output in milliseconds.
		mods: [],

		// Leave everything below here alone.
		botUser: "", // Automatically setup on init.
		botIdent: "ChunkBot reporting for duty. Boop beep bop.",
		commands: [],
		messageQueue: [], // List of things this bot wants to say.
		messageQueueInterval: null,
		previousOutput: [] // List of things already said -- limited to a small number (prevents self triggering).
	},


	/**
	 * Fetch a local file and execute it.
	 *
	 * @param localFile
	 */
	load: function(localFile) {
		// Fetch file using jQuery relative to current path, as defined in config.
		$.getScript(this.config.baseURL + localFile);
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
			callback: function(data) {}
		};
		var commandConfig = $.extend(defaults, config);

		// Setup a default title if not regex.
		if (commandConfig.title == "" && !(commandConfig instanceof RegExp)) commandConfig.title = commandConfig.text;

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

			// See if this exact message is from this user and in queue of previous output.
			if (data.from == ChunkBot.config.botUser && ChunkBot.config.previousOutput.indexOf(data.message) != -1) return;

			// Go through commands to see if a command matches this message and should be triggered.
			for(index in ChunkBot.config.commands) {
				var command = ChunkBot.config.commands[index];
				var found = false;
				if (command.text instanceof RegExp) {
					if (command.text.test(data.message)) found = true;
				} else {
					if (command.text.toLowerCase() == data.message.toLowerCase()) found = true;
				}

				// Run command callback now and break (if found).
				if (found) {
					command.callback(data);
					break;
				}
			}
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

			// Track previous output to prevent triggering on it.
			ChunkBot.config.previousOutput.push(text);

			// Prune previous output to short list.
			if (ChunkBot.config.previousOutput.length > 10) ChunkBot.config.previousOutput.length.shift();
		}
	},


	/**
	 * Destroy any previously defined settings if needed to start over clean again (incase reloading without completely
	 * reloading the page).
	 */
	cleanUp: function() {
		clearInterval(this.config.messageQueueInterval);
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


		// Load separately stored configuration.
		this.load("config.js");

		// Delegate API event hooks.
		for(event in this.events) {
			// Remove any existing hooks.
			API.off(API[event]);

			// Attach fresh hook.
			API.on(API[event], this.events[event]);
		}

		// Say something so I can find out who I am if I don't already know.
		if (this.config.botUser == "") this.say(this.config.botIdent);

		// Initialize the message queue loop.
		this.processMessageQueue();
		this.config.messageQueueInterval = setInterval(ChunkBot.processMessageQueue, ChunkBot.config.rateLimit);
	}
};


// Initialize!
ChunkBot.init();
