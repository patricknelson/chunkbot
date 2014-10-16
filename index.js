var gui = require('nw.gui'),
	path = require("path"),
	__dirname = require("./modules/dirname.js");


// Config.
// TODO: Set this up to load configuration info from separate directory. Consolidate with the older bot config files too.
var roomURL = "https://plug.dj/tt-fm-refugees/";
var creds = require("./creds.js");
var reloadAfter = 60; // Minutes in which this bot should be automatically reloaded (NOTE: Settings WILL be persisted!)


// Hide main window, show dev tools and ensure that application is closed if this window gets closed.
var mainWin = gui.Window.get();
mainWin.hide();
mainWin.showDevTools();
setInterval(function() {
	if (!mainWin.isDevToolsOpen()) process.exit();
}, 500);


// Plug window variables.
var plugDoc, plugWin, $;

// Bot instance.
var bot;

// Keep track of ALL intervals/timers so we can clear them all out in one place.
var intervals = {
	roomMonitor: 0,
	watchAPI: 0
}, timeouts = {
	waitAPI: 0,
	reload: 0,
	validateRoom: 0
};



/*******************************
 * LOAD PLUG.DJ AND LOGIN USER *
 *******************************/
var win, restarted = false; // TODO: WILL NEED TO EVENTUALLY NEED A CLEANER WAY TO MAINTAIN STATE after everything is restructured.
var initWin = function() {
	// Force close of existing window, if applicable.
	if (typeof win != "undefined") win.close(true);

	// Open a new window.
	win = gui.Window.get(
		window.open(roomURL)
	);
	win.hide();

	win.on("loaded", function() {
		plugWin = win.window;
		plugDoc = plugWin.document;
		$ = plugWin.$; // Utilize plug.dj's reference to jQuery.

		// Attempt to login, if available.
		var loginButton = plugDoc.querySelector(".header .existing button");
		if (loginButton) {
			console.log("[Autoloader] Attempting to login to plug.dj...");
			loginButton.click();

			// Populate login fields and submit form.
			plugDoc.querySelector("#email").value = creds.email;
			plugDoc.querySelector("#password").value = creds.password;
			plugDoc.querySelector("#submit").click();
		}

		// Initialize bot loader which monitors room URL, waits for the API and loads the bot when ready.
		initBotLoader();
	});
};
initWin();


/***************************************************
 * BOT LOADER MECHANISM (ADOPTED FROM USER SCRIPT) *
 ***************************************************/

var initBotLoader = function() {
	console.log("[Autoloader] Bot loader initialized.");

	// Clear out all intervals and timeouts now (in case this function has already been called).
	for(var i in intervals) clearInterval(intervals[i]);
	for(var t in timeouts) clearTimeout(timeouts[t]);

	// Set interval that monitors to ensure that we're always logged into the correct room.
	if (!validateRoom()) return;
	intervals.roomMonitor = setInterval(function() {
		if (!validateRoom()) {
			clearInterval(intervals.roomMonitor);
		}
	}, 1000);

	// Watch and wait for the API to become available...
	var startedWatching = (new Date()).getTime();
	intervals.watchAPI = setInterval(function() {
		if (getAPI()) {
			// Found API. Give it a few seconds to completely load...
			clearInterval(intervals.watchAPI);
			timeouts.waitAPI = setTimeout(function() {
				// Get previously stored configuration stored specifically for reload.
				var config = getSettings("config");

				// Load any persisted settings while applying current override configuration, since this is a page reload.
				console.log("Restarted: " + restarted);
				var configOverride = {};
				if (config) {
					console.log("Found config:");
					console.log(config);

					// Reset all configuration information EXCEPT for commands.
					for(var k in config) {
						if (k == "commands") continue;
						configOverride[k] = config[k];
					}

					// Retain "restarted" setting from current scope.
					configOverride.restarted = restarted;
					console.log("Saved restarted");
				}

				// Now load the bot!
				// TODO: Need to convert the rest of the bot to utilize node's module pattern!
				try {
					// Load bot module...
					bot = require("./bot.js");

					// ... and setup global instance in plug.dj window.
					plugWin.ChunkBot = bot;

					// Initialize bot in OLD architecture by passing through scope for various needed objects.
					bot.init($, console, getAPI(), configOverride);

					// Administrative functionality, given access to the bot itself for manipulation by commands.
					// TODO: This functionality will eventually all be properly packaged up... eventually.
					bot.restart = reloadBrowser;
					bot.die = function() {
						process.exit();
					};

					// Show load success.
					console.log("[Autoloader] Bot is now loaded! To show window, type 'win.show()' in the console and 'win.hide()' to hide again.");
					console.log("[Autoloader] To kill the bot, type 'bot.die()'. To restart, type 'bot.restart()'.");

				} catch(e) {
					console.log(e);
				}

				// Setup reload timeout.
				if (reloadAfter > 0) {
					timeouts.reload = setTimeout(function() {
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
};



/****************************
 * HELPER FUNCTIONS AND ETC *
 ****************************/

// Just a shortcut to help with refactoring from old user script.
var getAPI = function() {
	if (typeof plugWin != "undefined" && plugWin.API.getUser() && plugWin.API.getUser().username) return plugWin.API;
	return false;
};

// Small abstraction for persisting configuration after page load.
var settings = {}; // TODO: Storing this way since localStorage fails to work since node-webkit is utilizing data URL's for pages.
var storeSettings = function(name, values) {
	try {
		// In rare circumstances (changing between rooms), stringify below may result in "Converting circular structure to JSON".
		settings[name] = values;
	} catch (e) {}
};
var getSettings = function(name) {
	return settings[name];
};


// Allows reloading browser without losing settings.
var reloadBrowser = function() {
	// Store current ChunkBot configuration specifically for reload.
	storeSettings("config", bot.config);

	// Perform reload.
	restarted = true;
	win.close(true);
	initWin();
};


// Enables fetching username even when not in a room where the API global is typically available.
var getUser = function() {
	// Attempt to get username from the API first.
	if (getAPI()) {
		console.log(getAPI().getUser());
		return getAPI().getUser().username;
	}

	// Grab via HTML as a last resort (not officially supported and thus worse longevity).
	var userSpan = $("#footer-user .name span");
	if (userSpan.length == 0) return "";
	return userSpan.text();
};


// Indicates that the bot is located at the correct room URL.
var isValidRoom = function() {
	return parseRoom(roomURL) == parseRoom(getCurrentUrl());
};


// Current URL of plug.dj window.
var getCurrentUrl = function() {
	if (typeof plugWin.location.href == "undefined") return "";
	return plugWin.location.href;
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
		console.log("[Autoloader] Current room '" + parseRoom(getCurrentUrl()) + "' is not the properly configured room of '" + parseRoom(roomURL) + "', redirecting in 10 seconds...");
		timeouts.validateRoom = setTimeout(function() {
			reloadBrowser();
		}, 10000);
		return false;
	}
	return true;
};

