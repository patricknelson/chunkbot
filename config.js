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
//ChunkBot.config.botIdent = "ChunkBot reporting for duty. Boop beep bop.";

// Output song statistics after each play?
//ChunkBot.config.outputSongStats = true;


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
	text: "bot test",
	hide: true,
	callback: function(data) {
		// Only respond to admin.
		if (!ChunkBot.isAdmin(data.from)) return;

		// Respond saying test worked.
		ChunkBot.say("Ok, @" + data.from + "... your test worked!");
	}
}).addCommand({
	text: "bot dance",
	callback: function(data) {
		if (ChunkBot.vote(1)) {
			ChunkBot.sayRandom([
				"I was just about to anyway, @" + data.from + "!",
				"Alright no problem @" + data.from + "!",
				"If @" + data.from + " loves this song, so do I!",
				"Yeah @" + data.from + " this song ROCKS!"
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
});



// Administrative commands.
ChunkBot.addCommand({ // List all configured commands.
	text: "bot commands",
	callback: function(data) {
		// Only respond to current user.
		if (data.from != ChunkBot.config.botUser) return;

		// Build list of all commands currently available.
		var availCommands = [];
		for(i in ChunkBot.config.commands) {
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
		window.location.href = "javascript:$.getScript('" + ChunkBot.config.baseURL + "bot.js');";
	}
});



// Example regular expression-based commands. Second parameter of say() and sayRandom() indicates how often to respond.
ChunkBot.addCommand({
	text: /.*\b(lol|hehe?|haha?)\b.*/i,
	title: "kill joy (lol, hehe, ...)",
	callback: function(data) {
		ChunkBot.sayRandom([
			"Hahaha @" + data.from + ", oh man!",
			"ho ho ho",
			"@" + data.from + " that wasn't funny",
			"oh please"
		], 5);
	}
}).addCommand({ // ... in case user responds to the "ho ho ho" remark.
	text: /.*\bho ho ho\b.*/i,
	callback: function(data) {
		ChunkBot.say("Are you mocking me?");
	}
});



// Built-in room moderation commands.
ChunkBot.addCommand({ // Various binary settings we can turn on or off.
	text: /bot (enable|disable) (.*)/i,
	title: "bot (enable|disable) (setting)",
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
});


// Incorporate custom configuration (outside of git repo), if available.
ChunkBot.load("config-custom.js");
