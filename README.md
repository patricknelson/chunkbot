ChunkBot
========

**A plug.dj bot.**

To demo this bot, [visit this page](https://rawgithub.com/patricknelson/chunkbot/master/index.html) and set it up as a bookmarklet. Otherwise, you can host the bot JavaScript code on your own server. If you do, be sure to edit the `config.js` or `config-custom.js` files to add your own commands, if you want.

## Example Commands ##

Example **full text** match (case insensitive). You can chain multiple commands together as well.

	ChunkBot.addCommand({
		text: ".test",
		callback: function(data) {
			// Only respond to current user.
			if (data.from != ChunkBot.config.botUser) return;
	
			// Respond saying test worked.
			ChunkBot.say("Ok, " + data.from + "... your test worked!");
		}
	}).addCommand({
		text: ".test2",
		title: "custom title", // Used when generating list of commands.
		callback: function(data) {
			ChunkBot.say("This will work for everyone in the chat.");
		}
	});

You can even match chat comments based on **regular expressions** (currently required if you wish to match only a portion of the chat text). Note that the second parameter of say() and sayRandom() indicates how often to respond. For example:

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
