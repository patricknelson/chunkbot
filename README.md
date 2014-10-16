ChunkBot
========

**A node.js based Plug.dj bot.**

A chat and moderation bot for Plug.dj that runs isolated entirely in node.js. Even though the bot runs in node.js, it is still able to use primarily the published API's by proxy of utilizing the "node-webkit" module along with some and other reasonably simple manual tweaks to facilitate non-API based functionality.

**Documentation Under Construction**

This has just been converted from a user-script + external script combination, so more documentation on setup/configuration is coming soon. Also, a lot of refactoring still needs to be done in order to make the code more organized and oriented toward the standard node.js modular design pattern. 

##Configuration##

More detailed instructions coming soon.

1. Download and install [node-webkit](https://github.com/rogerwang/node-webkit). Make sure to add it to your system path.
2. Copy `config-sample.json` to `config.json` and edit to incorporate your plug.dj username and password.
3. Run by changing into the directory where you've downloaded these files and then type: `nw .`


##Auto-Loading and Auto-Refreshing##

Since plug.dj has a client-side JavaScript API, it has to run in its own browser instance (webkit), which can be prone to errors. There can be disconnects or page reloads, which could permanently render the bot disabled until someone manually reloads it again via the bookmarklet. A better approach would be to have this happen automatically as a fail-safe. That's why auto-loading and auto-refreshing is *extremely* useful for long-term setup.

Chrome is no longer needed! This automated reload/recovery process has been facilitated now via the primary `index.js` file (running in node-webkit) which supercedes the old Tampermonkey user script (formerly `bot.user.js` which ran in the browser).


## Example Commands ##

**WARNING:** Since the architecture of this system just changed to using node.js, this command syntax will likely change soon.

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

* Bug fix relating to song stats.
* **Node-webkit related:**
	* Setup better method for restarting bot to compensate for bugs in the current architecture.
	* Restructure bot completely to make the most of everything now using the same environment.
* General abstraction to set non boolean values (i.e. “bot set (name) (value)”).
* Ability to set **song time limit** via command “bot set timelimit 10”. 
* Auto skip if lame: Ability to enforce rule to force skip a song if it receives more “mehs” than “woots” (if over a threshold of “mehs” to prevent trolling). Would need to be enabled/disabled and a meh limit set. *May not be necessary???*
* **History:** Find way to build own history via monitoring API.getMedia() instead of relying on the sometimes buggy API.getHistory() method.


## Change Log ##

* `v0.5`
 + Moved to node.js/webkit architecture, away from the Tampermonkey (userscript) + browser script combination. Still needs more refactoring.
 + Major improvements.
* `v0.4`
 + New 'maintenance mode' protection to redirect back to original URL of the room in case browser is redirected away for any reason. Will attempt reload/redirect back to room every minute until back online.
 + Implemented the  `bot open bar` and `bot close bar` commands! Free beer for all (but only when admins grant it).
* `v0.3`
 + Chrome user script.
 + Disable easter eggs by default.
 + Abstraction to retrieve getUsername() (so configs don't rely on API)
 + Now using "ChunkBotConfig" global to allow direct override of config after config is loaded.
* `v0.2`
 + Added force skip functionality (skips song after it finishes playing if not skipped by system or user).
 + Ability to set admin users and automatically add admins based on room moderators/staff (manager and above).
 + Output bot identification on load (a.k.a. "bot ident").
 + Ability to vote up/down songs (woot/meh).
 + Better chat message detection to prevent triggering commands on own output.
 + Added a lot administrative and moderator commands! 
* `v0.1` - Inception.