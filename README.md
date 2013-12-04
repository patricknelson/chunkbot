ChunkBot
========

**A plug.dj bot.**

To demo this bot, [visit this page](https://rawgithub.com/patricknelson/chunkbot/master/index.html) and set it up as a bookmarklet. Otherwise, you can host the bot JavaScript code on your own server. If you do, be sure to edit the `config.js` or `config.custom.js` files to add your own commands, if you want.

**Important:** The bot must be loaded using the `ChunkBotURL` variable in a bookmarklet so that the bot can then autoload its configuration and external files. For example:

    javascript:var ChunkBotURL='http://server/bot.js';$.getScript(ChunkBotURL);  

Otherwise, you will have to set the `ChunkBot.config.baseURL` setting directly in the `bot.js` file.


##Auto-Loading and Auto-Refreshing ##

Since plug.dj has a client-side JavaScript API, it has to run in its own browser instance, which can be prone to errors. There can be disconnects or page reloads, which could permanently render the bot disabled until someone manually reloads it again via the bookmarklet. A better approach would be to have this happen automatically as a fail-safe. That's why auto-loading and auto-refreshing is *extremely* useful for long-term setup. 

You can set the bot up to automatically load when you visit plug.dj. To do this in Chrome, install [Tampermonkey](http://tampermonkey.net/), customize the `bot.user.js` script and paste in your customized code. You should also be able to use [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) for Firefox but this has not yet been tested.


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

## To Do ##

* General abstraction to set non boolean values (i.e. “bot set (name) (value)”).
* Ability to set **song time limit** via command “bot set timelimit 10”. 
* Auto skip if lame: Ability to enforce rule to force skip a song if it receives more “mehs” than “woots” (if over a threshold of “mehs” to prevent trolling). Would need to be enabled/disabled and a meh limit set. *May not be necessary???*
* **History:** Find way to build own history via monitoring API.getMedia() instead of relying on the sometimes buggy API.getHistory() method.
* Add command `bot openbar` to allow serving of drinks to anyone for 30 seconds.


## Change Log ##

* `v0.0.3`
 + Chrome user script.
 + Disable easter eggs by default.
 + Abstraction to retrieve getUsername() (so configs don't rely on API)
 + Now using "ChunkBotConfig" global to allow direct override of config after config is loaded.
* `v0.02`
 + Added force skip functionality (skips song after it finishes playing if not skipped by system or user).
 + Ability to set admin users and automatically add admins based on room moderators/staff (manager and above).
 + Output bot identification on load (a.k.a. "bot ident").
 + Ability to vote up/down songs (woot/meh).
 + Better chat message detection to prevent triggering commands on own output.
 + Added a lot administrative and moderator commands! 
* `v0.0.1` - Inception.