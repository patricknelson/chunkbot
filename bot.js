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

 * @package	ChunkBot v0.4
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
        forceSkip: false, // If songs should be forced to skip after they are finished (must be a moderator). So useful, this is enabled by default.
        outputSongStats: false, // If the bot should log stats about the last song played in the chat room.
        easterEggs: false, // Enable/disable any custom easter eggs.

        // These things below you shouldn't change in the config at all.
        admins: [], // Array of admin usernames who run admin-only commands. By default, current bot is included. Use addAdmin() to add admins to this list.
        botUser: "", // Automatically setup on init.
        baseURL: "", // Set via ChunkBotURL in BookMarklet when this bot is first pulled in. Needed to load additional files!
        commands: [], // Set via the addCommand() method.
        messageQueue: [], // List of things this bot wants to say.
        messageQueueInterval: null,
        previousOutput: [], // List of things already said -- limited to a small number (prevents self triggering).
        forceSkipInterval: null,
        lastSkipTime: null, // Indicates the last time a skip was performed (UNIX timestamp).
        skipDelay: 1000, // Amount of milliseconds to wait before allowing another skip.
        idleInterval: null,
        lastSeen: {}, // Used to maintain the array of users in chat and when they've last been seen. Maintained via idleInterval.
        div: $("<div />") // For utility purposes.
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
        for(var i = 1; i <= 10; i++) {
            oftenAnswers.push((howOften > 0 ? 1 : 0));
            howOften--;
        }

        // Determine if we're going to go at it THIS time . . .
        var rand = Math.floor(Math.random() * 10);
        if (oftenAnswers[rand] == 0) return;

        // Break long messages into palatable segments that plug.dj won't choke on.
        var regex = '.{1,251}(\\s|$)|\\S+?(\\s|$)';
        var textSegments = text.match(new RegExp(regex, "g"));
        for(var s in textSegments) {
            // Get segment to drop into queue.
            var segment = textSegments[s];

            // Track previous output to prevent triggering on it.
            ChunkBot.config.previousOutput.push(ChunkBot.normalizeMessage(segment));

            // Add message to queue, segment by segment.
            this.config.messageQueue.push(segment);
        }
    },


    /**
     * Say something random from the array of provided choices.
     *
     * @param responseArray
     * @param howOften		See the say() method.
     */
    sayRandom: function(responseArray, howOften) {
        // Select a random response.
        var randomIndex = Math.floor(Math.random() * responseArray.length);
        ChunkBot.say(responseArray[randomIndex], howOften);
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

        // Remove instances of apparent emoji's.
        message = message.replace(/:[a-z]+:/g, '');

        // Remove HTML code.
        message = ChunkBot.config.div.html(message).text();

        // Remove entities which typically are used for non alphanumeric chars.
        message = message.replace(/&[#0-9a-z]{2,5};/ig, "");

        // Remove non alphanumeric chars.
        message = message.replace(/[^a-z0-9 ]/ig, "");

        // Normalize whitespace.
        message = message.replace(/[\s]+/g, ' ').trim();

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
            if (user.role >= 3 && admins.indexOf(username) == -1) admins.push(username);
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
        return (admins.indexOf(username.toLowerCase()) != -1);
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
        // Don't worry about doing anything if there's no DJ on stage or if a DJ is on stage but the media object hasn't YET loaded (i.e. just stepped up from having no DJ).
        if (typeof API.getDJ() == "undefined" || typeof API.getMedia() == "undefined") return;

        // Get remaining time and skip if the song is over.
        var remaining = API.getTimeRemaining();
        if (remaining % 30 == 0 && remaining > 0) console.log("Time remaining: " + remaining + " seconds.");
        if (remaining <= 0) ChunkBot.skip();
    },


    /**
     * Skips the currently playing song.
     */
    skip: function() {
        // Don't worry about doing anything if there's no DJ on stage or if a DJ is on stage but the media object hasn't YET loaded (i.e. just stepped up from having no DJ).
        if (typeof API.getDJ() == "undefined" || typeof API.getMedia() == "undefined") return;

        // Ensure we haven't just skipped recently.
        var skipThreshold = ChunkBot.config.lastSkipTime + ChunkBot.config.skipDelay;
        if ((new Date()).getTime() < skipThreshold) return;

        // Perform skip and track.
        API.moderateForceSkip();
        console.log("Skipped song.");
        ChunkBot.config.lastSkipTime = (new Date()).getTime();
    },


    /**
     * Simply runs every so often to maintain list of users in chat to watch.
     */
    processIdle: function() {
        // Start with an empty object of users.
        var lastSeen = {};
        var users = API.getUsers();
        for(var i in users) {
            // Use the ID as the object key.
            var user = users[i];
            var id = user.id;

            // See if we already have a time for this user.
            var time = 0;
            if (typeof ChunkBot.config.lastSeen[id] != "undefined") time = ChunkBot.config.lastSeen[id].time;

            // Update current last object.
            lastSeen[id] = {
                username: user.username,
                time: time
            };
        }

        // Persist last seen object in config.
        ChunkBot.config.lastSeen = lastSeen;
    },


    /**
     * Returns last seen data based only on the current DJ and users in the waiting list.
     *
     * @returns {{}}
     */
    getDjTimes: function() {
        // Get users in waiting list
        var users = API.getWaitList();
        if (API.getDJ()) users.unshift(API.getDJ()); // Add DJ to top of list.

        // Build custom "lastSeen" object.
        var lastSeen = {};
        for(var i in users) {
            // Use the ID as the object key.
            var user = users[i];
            var id = user.id;
            if (typeof ChunkBot.config.lastSeen[id]) lastSeen[id] = ChunkBot.config.lastSeen[id];
        }

        return lastSeen;
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
        if (history.length == 0) return [];
        var currentMedia = API.getMedia();
        var firstMedia = history[0].media;
        if (typeof currentMedia != "undefined" && currentMedia.cid == firstMedia.cid) history.shift();

        number = Math.min(number, 5, history.length);
        for(var i = 0; i < number; i++) {
            var item =  history[i];
            var media = item.media;
            var user = item.user;
            var score = item.score;

            last.push({
                user: user.username,
                song: "'" + media.title + "' by '" + media.author + "'",
                woot: score.positive,
                meh: score.negative,
                grabs: score.grabs
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
        for(var i in last) {
            var song = last[i];
            var message = song.user + " played " + song.song + " (" + song.woot +  " :+1: / " + song.meh + " :-1: / " + song.grabs + " :heart:)";
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
            un: ChunkBot.config.botUser,
            uid: "",
            language: "en",
            message: message,
            room: "",
            type: "message"
        });
    },


    /**
     * Provides capability to boot a user by proxy of banning and unbanning very quickly (since there is no native
     * "boot" functionality).
     *
     * @param username
     */
    boot: function(username, reason) {
        // Convert to lowercase for quick/accurate comparison.
        username = username.toLowerCase();
        if (typeof reason == "undefined") reason = "[no reason given]";

        // Suffix reason with temporary ban, since this isn't really permanent.
        reason += "  (temporary ban)";

        // Don't boot yourself.
        if (username == ChunkBot.config.botUser.toLowerCase()) {
            ChunkBot.say("I'm not going to ban myself, sorry.");
            return;
        }

        // Go through users and look for a match in the username.
        console.log("Attempting to boot '" + username + "' for '" + reason + "'.");
        var users = API.getUsers();
        for(var i in users) {
            var user = users[i];
            if (user.username.toLowerCase() == username) {
                // Get user's ID and perform ban.
                var userID = user.id;
                API.moderateBanUser(userID, reason);
                ChunkBot.say("Booted " + user.username + " (" + userID + ") for '" + reason + "'");

                // Set timeout to unban user after a few seconds.
                setTimeout(function() {
                    API.moderateUnbanUser(userID);
                }, 2000);

                return;
            }
        }

        // User was not found.
        console.log("User not found!");
    },


    /**
     * Quick shortcut for returning current easter egg configuration.
     *
     * @returns {boolean}
     */
    eggs: function() {
        return ChunkBot.config.easterEggs;
    },


    /**
     * Returns currently logged in user's username.
     *
     * @returns {string}
     */
    getUsername: function() {
        return API.getUser().username;
    },


    /**
     * Returns time elapsed on current song.
     *
     * @returns {int}
     */
    elapsed: function() {
        return API.getTimeElapsed();
    },


    /**
     * Consistent method for displaying elapsed/remaining time in seconds.
     *
     * @param totalSeconds
     * @returns {string}
     */
    formatSeconds: function(totalSeconds) {
        // Get current elapsed time in hours, minutes and seconds.
        var hours = Math.floor(totalSeconds / 60 / 60);
        var minutes = Math.floor((totalSeconds / 60) % 60);
        var seconds = totalSeconds % 60;

        // Generate message.
        var output = "";
        if (hours > 0) output = hours + ":" + (minutes < 10 ? "0" : "");
        output += minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
        return output;
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
            // Augment data object to allow backward compatibility for old "from" and "fromID" properties.
            data.from = data.un;
            data.fromID = data.uid;

            // Log message from user in console.
            console.log("[Chat] " + data.un + ": " + data.message);

            // Track the time that this user has sent a chat message.
            if (typeof ChunkBot.config.lastSeen[data.uid] != "undefined") ChunkBot.config.lastSeen[data.uid].time = (new Date()).getTime();

            // Ensure bot doesn't trigger a command on itself.
            if (ChunkBot.config.botUser == "" && data.message == ChunkBot.config.botIdent) ChunkBot.config.botUser = data.un;

            // See if this exact message is from this user...
            if (data.un == ChunkBot.config.botUser && ChunkBot.hasSaid(data.message)) return;

            // Go through commands to see if a command matches this message and should be triggered.
            for(var index in ChunkBot.config.commands) {
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

            // Wait a little while first before allowing a force skip this gives the API.getTimeRemaining() to start returning valid results.
            if (ChunkBot.config.forceSkip) {
                ChunkBot.forceSkip(false);
                setTimeout(function() {
                    ChunkBot.forceSkip(true);
                }, 5000);
            }
        },

        // History update.
        HISTORY_UPDATE: function(data) {
            console.log("[History Update]");

            // Output stats, if desired.
            if (ChunkBot.config.outputSongStats) ChunkBot.say(ChunkBot.getStatsMessage(1));
        },

        // Waiting list changes.
        WAIT_LIST_UPDATE: function(users) {

        },

        // User enter room.
        USER_JOIN: function(user) {
            console.log("[User Enter] " + user.username);
        },

        // User leave room.
        USER_LEAVE: function(user) {
            console.log("[User Leave] " + user.username);
        }

    },


    /**
     * Delegate configured Plug.dj API event hooks to this bot.
     */
    setupEvents: function() {
        // Remove any existing hooks now.
        ChunkBot.removeEvents();

        // Delegate API event hooks.
        for(var event in ChunkBot.events) {
            // Attach fresh hook.
            API.on(API[event], this.events[event]);
        }
    },


    /**
     * Detaches configured event hooks.
     */
    removeEvents: function() {
        for(var event in ChunkBot.events) {
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
        clearInterval(ChunkBot.config.idleInterval);
        ChunkBot.forceSkip(false);
        ChunkBot.removeEvents();
    },


    /**
     * Causes the bot to kill itself.
     */
    unload: function() {
        console.log("Unloading bot now.");
        ChunkBot.processMessageQueue();
        ChunkBot.cleanUp();
        ChunkBot = null;
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
        this.config.botUser = this.getUsername();
        this.addAdmin(ChunkBot.config.botUser);

        // Setup overriding configuraiton, if any.
        var ChunkBotConfig = (typeof window.ChunkBotConfig != "undefined" ? window.ChunkBotConfig : {});

        // Load separately stored configuration.
        this.load("config.js", function() {
            // Override loaded configuration, if any globally set config exists.
            for(var i in ChunkBotConfig) ChunkBot.config[i] = ChunkBotConfig[i];

            // Say something in chat to advertise successful load.
            ChunkBot.say(ChunkBot.config.botIdent);
            console.log("Loaded bot configuration:");
            console.log(ChunkBot.config);

            // Initialize the message queue loop.
            ChunkBot.processMessageQueue();
            ChunkBot.config.messageQueueInterval = setInterval(ChunkBot.processMessageQueue, ChunkBot.config.rateLimit);

            // Read config to determine if skipping is enabled by default.
            ChunkBot.forceSkip(ChunkBot.config.forceSkip);

            // Start the idle processing loop.
            ChunkBot.config.idleInterval = setInterval(ChunkBot.processIdle, 3000);
        });
    }
};


// Initialize!
ChunkBot.init();
