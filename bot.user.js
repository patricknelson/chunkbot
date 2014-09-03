// ==UserScript==
// @name		ChunkBot Autoloader
// @author		Patrick Nelson (pat@catchyour.com) a.k.a. chunk_split()
// @namespace	https://github.com/patricknelson/chunkbot
// @version		0.3
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

	// Watch and wait for the API to become available...
	var startedWatching = (new Date()).getTime();
	var watchAPI = setInterval(function() {
		if (typeof API != "undefined" && API.getUser() && API.getUser().username) {
			// Found API. Give it a few seconds to completely load...
			clearInterval(watchAPI);
			setTimeout(function() {
				// Check to see if the user is the correct bot user to load as.
				if (API.getUser().username.toLowerCase() != botUser.toLowerCase()) {
					console.log("[Autoloader] The user '" + API.getUser().username + "' is not the bot user, exiting now.");
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


	// Small abstraction for persisting configuration after page load.
	var storeSettings = function(name, settings) {
		localStorage.setItem(name, JSON.stringify(settings));
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
});
