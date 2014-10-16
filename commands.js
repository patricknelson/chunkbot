// TODO: Change config/command syntax in light of node-webkit architecture.

module.exports = function(ChunkBot) {

	/*************************
	 * GENERAL CONFIGURATION *
	 *************************/

	// The fastest that this bot will generate messages in succession (milliseconds).
	//ChunkBot.config.rateLimit = 1500;

	// Enable force skipping by default?
	//ChunkBot.config.forceSkip = false;

	// Automatically set staff to admin? Default is true.
	//ChunkBot.config.autoAdminStaff = false;

	// Manually setup additional admin users here.
	//ChunkBot.addAdmin("enter username here");

	// Setup message that displays on start up.
	ChunkBot.config.botIdent = "ChunkBot reporting for duty. Boop beep bop.";

	// Output song statistics after each play?
	ChunkBot.config.outputSongStats = true;

	// Allow easter eggs by default?
	//ChunkBot.config.easterEggs = true;



	/******************
	 * SETUP COMMANDS *
	 ******************/

	/* Some boilerplate command code for your copy-paste pleasure.

	ChunkBot.addCommand({
		text: "COMMAND",
		callback: function(data) {
			// Only respond to admin.
			if (!ChunkBot.isAdmin(data.from)) return;

			// DO STUFF HERE
		}
	});

	*/

	// Example full text match (case insensitive). You can chain multiple commands together as well.
	ChunkBot.addCommand({ // Test command.
		text: /^\s*bot( test)?\s*$/,
		hide: true,
		callback: function(data) {
			// Only respond to admins.
			if (!ChunkBot.isAdmin(data.from)) return;

			// Respond saying test worked.
			ChunkBot.sayRandom(["Ok, @" + data.from + "... your test worked!", "Am not human, but am a life-form; have soul.", "No Disassemble!", "Johnny 5 is alive!"]);
		}
	}).addCommand({
		text: /.*\bbot\b.*\b(dance|boog(y|ie)|twerk|fire|emoji-1f525)\b.*/ig,
		title: "bot dance",
		callback: function(data, matches) {
			if (ChunkBot.vote(1)) {
				ChunkBot.sayRandom([
					"I was just about to anyway, @" + data.from + "!",
					"Alright no problem @" + data.from + "!",
					"If @" + data.from + " loves this song, so do I!",
					"Yeah @" + data.from + " this song ROCKS!",
					"I shall drop it like it's hot, @" + data.from + "."
				]);
			} else {
				ChunkBot.sayRandom([
					"I'm already dancin' @" + data.from + ", I canna dance any HARDAH!",
					"Wow you people are demanding, especially @" + data.from + ".",
					"Want me to STOP dancing??? @" + data.from,
					"Hey YOU dance @" + data.from + "!",
					"I'm already dancing, @" + data.from + ".",
					"You can't tell me what to do @" + data.from + "!",
					"Someone already told me to, @" + data.from + "."
				]);
			}
		}
	}).addCommand({
		text: /.*\bbot\b.*\b(lame|poop|emoji-1f4a9)\b.*/ig,
		title: "bot dance",
		callback: function(data, matches) {
			if (!ChunkBot.isAdmin(data.from) || true) ChunkBot.say(["Nope.", "No.", "Heh, nah.", "That's alright."], 8);

			if (ChunkBot.vote(-1)) {
				ChunkBot.sayRandom([
					"I was just about to anyway, @" + data.from + "!",
					"Alright no problem @" + data.from + "!",
					"If @" + data.from + " hates this song, so do I!",
					"Yeah @" + data.from + " this song SUCKS!",
					"I shall drop it like it's cold, @" + data.from + "."
				]);
			} else {
				ChunkBot.sayRandom([
					"I'm already lamin' @" + data.from + ", I canna lame any HARDAH!",
					"Wow you people are demanding, especially @" + data.from + ".",
					"Want me to START dancing??? @" + data.from,
					"Hey YOU lame it @" + data.from + "!",
					"I'm already laming it, @" + data.from + ".",
					"You can't tell me what to do @" + data.from + "!",
					"Someone already told me to, @" + data.from + "."
				]);
			}
		}
	}).addCommand({
		text: /bot last( ([1-5]))?/i,
		callback: function(data, matches) {
			// Get desired number of songs to show.
			var number = matches[2];
			if (typeof number == "undefined") number = 1;
			ChunkBot.say(ChunkBot.getStatsMessage(number));
		}
	}).addCommand({
		text: "bot time",
		callback: function(data) {
			ChunkBot.say("Time elapsed: " + ChunkBot.formatSeconds(ChunkBot.elapsed()) + " @" + data.from);
		}
	}).addCommand({
		text: /bot (djs|dj times)/i,
		callback: function(data) {
			// Admin functionality only.
			if (!ChunkBot.isAdmin(data.from)) return;

			// Generate message based on the list of users in the room and when they were list seen.
			var users = ChunkBot.getDjTimes();
			var messageParts = [];
			var now = (new Date()).getTime();
			for(var i in users) {
				var user = users[i];
				var timeOut = "?";
				if (user.time > 0) {
					var timeDiff = Math.floor((now - user.time) / 1000);
					timeOut = ChunkBot.formatSeconds(timeDiff);
				}
				messageParts.push(user.username + ": " + timeOut);
			}

			// Output generated message.
			ChunkBot.say(messageParts.join(" :zap: "));
		}
	});



	/*****************************
	 * OPEN BAR COMMANDS & LOGIC *
	 *****************************/

	var openBar = {
		// Settings.
		enabled: false,
		seconds: 60,
		countdown: 0,
		timeout: 0,

		// Functionality.
		loop: function() {
			if (this.countdown == 30) ChunkBot.say(":fire: You've got 30 seconds until the bar closes! :fire:");
			if (this.countdown == 10) ChunkBot.say(":fire: Hurry up! Only 10 seconds remain until the bar closes! :fire:");
			Chunkbot.log("Open bar seconds remaining: " + openBar.countdown);

			this.countdown--;
			if (this.countdown > 0) {
				this.timeout = setTimeout(function() {
					openBar.loop();
				}, 1000)
			} else {
				this.stop();
			}
		},

		start: function() {
			ChunkBot.say(":beers: The bar is now open for " + openBar.seconds + " seconds! FREE BEER FOR EVERYONE! Say 'bot drink' or 'bot drinks' to get your free drink. :beers:");
			this.enabled = true;
			this.countdown = this.seconds;
			clearTimeout(this.timeout);
			this.loop();
		},

		stop: function () {
			this.enabled = false;
			clearTimeout(this.timeout);
			ChunkBot.say(":poop: Alright folks, fun is over. The bar is now closed for business! :poop:");
		}
	};


	// Open bar commands.
	ChunkBot.addCommand({
		text: /bot drink(s)?/i,
		callback: function(data, matches) {
			if (!ChunkBot.isAdmin(data.from) && !openBar) {
				ChunkBot.sayRandom([
					"Do you think this is a fucking game @" + data.from + "? I aint woobot mother fucker.",
					"Get your own fucking drink, @" + data.from + "!",
					"Go away @" + data.from + ", I don't like you."
				]);
			} else {
				var drink = (matches[1] == "s" ? ":beers:" : ":beer:");
				ChunkBot.sayRandom([
					"Anything for you, bro! " + drink,
					"You got it. " + drink,
					"Alright! " + drink,
					"Cheers, mate! " + drink
				]);
			}
		}
	}).addCommand({
		text: /bot (open|close) ?bar/,
		title: "bot [open|close] bar",
		callback: function(data, matches) {
			if (!ChunkBot.isAdmin(data.from)) {
				ChunkBot.sayRandom(['Hah! Nope.', 'Nice try.', "Ain't gonna happen.", 'Rejection is hard.']);
				return;
			}

			// Parse command.
			var command = matches[1];
			if (command == "open" && !openBar.enabled) {
				// Announce open bar and set a crappy timer loop.
				openBar.start();

			} else if (command == "close" && openBar.enabled) {
				ChunkBot.say(":poop: Well someone is a party pooper. :poop:");
				openBar.stop();
			}
		}
	});

	/*********************************
	 * END OPEN BAR COMMANDS & LOGIC *
	 *********************************/


	// Administrative commands.
	ChunkBot.addCommand({ // List all configured commands.
		text: "bot commands",
		callback: function(data) {
			// Only respond to admin
			if (!ChunkBot.isAdmin(data.from)) return;

			// Build list of all commands currently available.
			var availCommands = [];
			for(var i in ChunkBot.config.commands) {
				var command = ChunkBot.config.commands[i];
				if (command.hide) continue;
				if (command.title == "") continue; // Don't know what to call it, so move on.
				availCommands.push(command.title);
			}
			ChunkBot.say("Available commands are: " + availCommands.join(", "));
		}
	}).addCommand({ // List all current admins.
		text: "bot admins",
		callback: function(data) {
			if (!ChunkBot.isAdmin(data.from)) return;
			ChunkBot.say("Current admins are: " + ChunkBot.getAdmins().join(", "));
		}
	}).addCommand({
		text: "bot die",
		callback: function(data) {
			if (!ChunkBot.isAdmin(data.from)) {
				ChunkBot.sayRandom(["Nope.", "Not a chance.", "No way.", "You die."]);
			} else {
				ChunkBot.sayRandom(["Sayonara suckers!", "Alright :( ChunkBot out.", "Adios!", "ok :("]);
				ChunkBot.unload();
			}
		}
	}).addCommand({
		text: "bot restart",
		callback: function(data) {
			// Only respond to admin.
			if (!ChunkBot.isAdmin(data.from)) return;

			// Restart bot completely by reloading the main JavaScript file itself, which resets the object and its configuration.
			ChunkBot.say("Attempting restart...");
			ChunkBot.processMessageQueue();
			ChunkBot.restart();
		}
	});



	// Example regular expression-based commands. Second parameter of say() and sayRandom() indicates how often to respond.
	ChunkBot.addCommand({
		text: /.*\b(lol|hehe?|haha?)\b.*/i,
		title: "kill joy (easter egg for lol, hehe, ...)",
		callback: function(data) {
			if (!ChunkBot.eggs()) return;
			ChunkBot.sayRandom([
				"Hahaha @" + data.from + ", oh man!",
				"ho ho ho",
				"@" + data.from + " that wasn't funny",
				"oh please"
			], 5);
		}
	}).addCommand({ // ... in case user responds to the "ho ho ho" remark.
		text: /.*\bho ho ho\b.*/i,
		hide: true,
		callback: function(data) {
			if (!ChunkBot.eggs()) return;
			ChunkBot.say("Are you mocking me?");
		}
	});



	// Built-in room moderation commands.
	ChunkBot.addCommand({ // Various binary settings we can turn on or off.
		text: /bot (enable|disable) (.*)/i,
		title: "bot (enable|disable) (skip|stats|eggs)",
		callback: function(data, matches) {
			// Only respond to admin.
			if (!ChunkBot.isAdmin(data.from)) {
				ChunkBot.sayRandom(["Go away.", "Stop it.", "That tickles."], 5);
				return;
			}

			// Determine if we're turning it on or off.
			var enable = (matches[1].toLowerCase() == "enable");

			// What setting are we playing with?
			switch(matches[2].toLowerCase()) {
				case "autoskip":
				case "skip":
					if (ChunkBot.forceSkip(enable)) {
						if (enable) {
							message = "Ok, songs will be automatically skipped from now on (after they have ended).";
						} else {
							message = "Automatic force skip has been disabled!";
						}
					} else {
						message = "Automatic force skipping is already " + (enable ? "enabled" : "disabled") + ".";
					}
					ChunkBot.say(message);
					break;

				case "stats":
					if (ChunkBot.config.outputSongStats != enable) {
						ChunkBot.config.outputSongStats = enable;
						message = "Ok, song stats will " + (enable ? "now" : "no longer") + " be output after each DJ plays.";
					} else {
						message = "Song stats are already " + (enable ? "enabled" : "disabled") + ".";
					}
					ChunkBot.say(message);
					break;

				case "eggs":
					if (ChunkBot.config.easterEggs != enable) {
						ChunkBot.config.easterEggs = enable;
						message = "Ok, easter eggs are " + (enable ? "now" : "no longer") + " enabled.";
					} else {
						message = "Easter eggs are already " + (enable ? "enabled" : "disabled") + ".";
					}
					ChunkBot.say(message);
					break;
			}
		}
	}).addCommand({
		text: "bot skipsong",
		callback: function(data) {
			// Only respond to admin.
			if (!ChunkBot.isAdmin(data.from)) {
				ChunkBot.say("No.");
			}
			ChunkBot.skip();
		}
	}).addCommand({
		text: /^bot boot @?(.*?)( (for|because) (.+))?$/i,
		title: "bot boot @username for (reason)",
		callback: function(data, matches) {
			// Only respond to admin.
			if (!ChunkBot.isAdmin(data.from)) return;

			// Get desired username and tell bot to boot them.
			var username = matches[1];
			var reason = matches[4];
			ChunkBot.boot(username, reason)
		}
	});

};
