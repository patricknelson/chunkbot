// ==UserScript==
// @name		ChunkBot Autoloader
// @author		Patrick Nelson (pat@catchyour.com) a.k.a. chunk_split()
// @namespace	https://github.com/patricknelson/chunkbot
// @version		0.4
// @description	Automatically loads the ChunkBot when
// @match		*://plug.dj/*
// @match		*://www.plug.dj/*
// @copyright	2013+, Patrick Nelson
// @require        https://ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min.js
// ==/UserScript==



/************************
 * CUSTOM CONFIGURATION *
 ************************/
// Required.
var ChunkBotURL = '';
var botUser = '';
var roomURL = ''; // URL of the room to reload to (in case plug.dj decides to redirect away, like for maintenance).

// Optional.
var muteOnLoad = true; // Mute volume in the window that this bot is running in.
var reloadAfter = 60; // Minutes in which this bot should be automatically reloaded (NOTE: Settings WILL be persisted!)

// Configuration parameters to override on AUTO-RELOAD (via reloadAfter above).
var ChunkBotConfig = {
	botIdent: "" // Will suppress bot ident on auto-reload and any future resets.
};
/****************************
 * END CUSTOM CONFIGURATION *
 ****************************/

$(function(){
	console.log("[Autoloader initialized]");

	// Prevent loading script inside a frame (fixes issues with multiple instances).
	if (window.top != window.self) {
		console.log("[Autoloader] Running in frame, exiting now!");
		return;
	}

	// Set interval that monitors to see if we're currently logged into the correct room.
	if (!validateRoom()) return;
	var roomMonitor = setInterval(function() {
		if (!validateRoom()) {
			clearInterval(roomMonitor);
		}
	}, 1000);

	// Watch and wait for the API to become available...
	var startedWatching = (new Date()).getTime();
	var watchAPI = setInterval(function() {
		if (typeof API != "undefined" && API.getUser() && API.getUser().username) {
			// Found API. Give it a few seconds to completely load...
			clearInterval(watchAPI);
			setTimeout(function() {
				// Check to see if the user is the correct bot user to load as.
				if (!isValidUser()) {
					console.log("[Autoloader] The user '" + getUser() + "' is not the bot user, exiting now.");
					return;
				}

				// Get previously stored configuration stored specifically for reload.
				var config = getSettings("config");

				// Load any persisted settings while applying current override configuration, since this is a page reload.
				if (config) {
					// Reset all configuration information EXCEPT for commands.
					var newConfig = {};
					for(var i in config) {
						if (i == "commands") continue;
						newConfig[i] = config[i];
					}

					// Setup final overriding configuration, allowing ChunkBotConfig to have final say.
					unsafeWindow.ChunkBotConfig = $.extend(newConfig, ChunkBotConfig);
				}

				// Now load the bot!
				unsafeWindow.ChunkBotURL = ChunkBotURL;
				unsafeWindow.$.getScript(ChunkBotURL, function() {
					// Destroy persisted settings now, since the bot was loaded successfully.
					if (config) storeSettings("config", null);
				});

				// Setup another timeout to mute the sound after a while.
				if (muteOnLoad) {
					setTimeout(function() {
						unsafeWindow.API.setVolume(0);
					}, 3000)
				}

				// Setup reload timeout.
				if (reloadAfter > 0) {
					setTimeout(function() {
						reloadBrowser();
					}, reloadAfter * 1000 * 60);
				}

			}, 3000);
		} else {
			// Attempt to get the username now and see if this is a valid user.
			if (getUser() && !isValidUser()) {
				console.log("[Autoloader] The user '" + getUser() + "' is not the bot user, exiting now.");
				clearInterval(watchAPI);
				return;
			}

			// If we've been watching for 60 seconds and still no joy, let's try reloading again!
			var now = (new Date()).getTime();
			var beenWatching = (now - startedWatching) / 1000;
			var threshold = 60;
			var remaining = Math.floor(threshold - beenWatching);
			var warnAt = 20; // remaining.
			var message = "Waiting for API...";
			if (remaining <= warnAt) message += " reloading to try again in " + remaining + " seconds.";
			console.log(message);

			if (beenWatching >= threshold) reloadBrowser();
		}
	}, 1000);

});


	// Small abstraction for persisting configuration after page load.
	var storeSettings = function(name, settings) {
	try {
		// In rare circumstances (changing between rooms), stringify below may result in "Converting circular structure to JSON".
		localStorage.setItem(name, JSON.stringify(settings));
	} catch (e) {}
	};
	var getSettings = function(name) {
		return JSON.parse(localStorage.getItem(name));
	};


	// Allows reloading browser without losing settings.
	var reloadBrowser = function() {
		// Store current ChunkBot configuration specifically for reload.
		if (typeof unsafeWindow.ChunkBot != "undefined") storeSettings("config", unsafeWindow.ChunkBot.config);
		unsafeWindow.location.href = roomURL;
	};


// Enables fetching username even when not in a room where the API global is typically available.
var getUser = function() {
	// Attempt to get username from the API first.
	if (typeof API != "undefined" && API.getUser() && API.getUser().username) return API.getUser().username;

	// Grab via HTML as a last resort (not officially supported and thus worse longevity).
	var userSpan = $("#footer-user .name span");
	if (userSpan.length == 0) return "";
	return userSpan.text();
};


// Indicates that the currently logged in user is a valid bot user.
var isValidUser = function() {
	return getUser().toLowerCase() == botUser.toLowerCase();
};



// Indicates that the bot is located at the correct room URL.
var isValidRoom = function() {
	return parseRoom(roomURL) == parseRoom(window.location.href);
};


// Pulls out the lowercase name of the room based on the [presumably valid] room URL.
var parseRoom = function(url) {
	// Break URL into segments and return first non-empty segment.
	var segments = url.split("/");
	var segment;
	while ((segment = segments.pop()) !== undefined) {
		if (segment != "") return segment.toLowerCase();
	}

	return "";
};


// Centralized room validation and redirect.
var validateRoom = function() {
	if (!isValidRoom()) {
		console.log("[Autoloader] Current room '" + parseRoom(window.location.href) + "' is not the properly configured room of '" + parseRoom(roomURL) + "', redirecting in 10 seconds...");
		setTimeout(function() {
			reloadBrowser();
		}, 10000);
		return false;
	}
	return true;
};
