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
var doc, unsafeWindow, $;

// Bot instance (both are the same instance).
var ChunkBot, bot;

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

	win.on("loaded", function() {
		unsafeWindow = win.window; // Retaining old name from user script for now.
		doc = win.window.document;
		$ = unsafeWindow.$; // Utilize plug.dj's reference to jQuery.

		// Attempt to login, if available.
		var loginButton = doc.querySelector(".header .existing button");
		if (loginButton) {
			loginButton.click();

			// Populate login fields and submit form.
			doc.querySelector("#email").value = creds.email;
			doc.querySelector("#password").value = creds.password;
			doc.querySelector("#submit").click();
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
	for(i in intervals) clearInterval(intervals[i]);
	for(t in timeouts) clearTimeout(timeouts[t]);

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
				console.log("Found config:");
				console.log(config);
				if (config) {
					// Reset all configuration information EXCEPT for commands.
					var newConfig = {};
					for(var i in config) {
						if (i == "commands") continue;
						newConfig[i] = config[i];
					}

					// Retain "restarted" setting from current scope.
					newConfig.restarted = restarted;
					console.log("Saved restarted");

					// Setup final overriding configuration, allowing ChunkBotConfig to have final say.
					unsafeWindow.ChunkBotConfig = $.extend(newConfig, unsafeWindow.ChunkBotConfig);
				}

				// TODO: Now load the bot!
				// TODO: Need to convert the rest of the bot to utilize node's module pattern!
				try {
					// Load bot module...
					bot = ChunkBot = require("./bot.js");

					// ... and setup global instance in plug.dj window.
					unsafeWindow.ChunkBot = bot;

					// Initialize bot in OLD architecture by passing through scope for various needed objects.
					bot.init($, console, getAPI(), unsafeWindow, reloadBrowser);

					// Administrative functionality, given access to the bot itself for manipulation by commands.
					// TODO: This functionality will eventually all be properly packaged up... eventually.
					bot.restart = reloadBrowser;
					bot.die = function() {
						process.exit();
					};


					// Hide bot window.
					console.log("[Autoloader] Bot is now loaded! To show window, type 'win.show()' in the console and 'win.hide()' to hide again.");
					console.log("[Autoloader] To kill the bot, type 'bot.die()'. To restart, type 'bot.restart()'.");
					win.hide();

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
	if (typeof unsafeWindow != "undefined" && unsafeWindow.API.getUser() && unsafeWindow.API.getUser().username) return unsafeWindow.API;
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
	return parseRoom(roomURL) == parseRoom(unsafeWindow.location.href);
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
		console.log("[Autoloader] Current room '" + parseRoom(unsafeWindow.location.href) + "' is not the properly configured room of '" + parseRoom(roomURL) + "', redirecting in 10 seconds...");
		timeouts.validateRoom = setTimeout(function() {
			reloadBrowser();
		}, 10000);
		return false;
	}
	return true;
};

