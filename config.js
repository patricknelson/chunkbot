/******************
 * SETUP COMMANDS *
 ******************/


// Example full text match (case insensitive). You can chain multiple commands together as well.
ChunkBot.addCommand({
	text: ".test",
	callback: function(data) {
		// Only respond to current user.
		if (data.from != ChunkBot.config.botUser) return;

		// Respond saying test worked.
		ChunkBot.say("Ok, " + data.from + "... your test worked!");
	}
}).addCommand({
	text: ".commands",
	callback: function(data) {
		// Only respond to current user.
		if (data.from != ChunkBot.config.botUser) return;

		// Build list of all commands currently available.
		var availCommands = [];
		for(i in ChunkBot.config.commands) {
			var title = ChunkBot.config.commands[i].title;
			if (title == "") continue; // Don't know what to call it, so move on.
			availCommands.push(title);
		}
		ChunkBot.say("Available commands are: " + availCommands.join(", "));
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
			"herp.",
			"@" + data.from + " that wasn't funny",
			"oh please"
		], 5);
	}
});


// Incorporate custom configuration (outside of git repo), if available.
ChunkBot.load("config-custom.js");
