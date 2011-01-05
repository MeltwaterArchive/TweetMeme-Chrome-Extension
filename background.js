/**
* Register globals
*/
console.log('Starting TweetMeme Extension');
var urls = new Array();
var CACHE_ERROR = 'TM_ERROR_RETURNED';
var timeout = setInterval(clearCaches, 1800000);

/**
* Set up our debugging configuration
*/
var debugEnabled = false;
var errorEnabled = false;

function enableDebug() { debugEnabled = true; return 'Debugging Enabled'; }
function disableDebug() { debugEnabled = false; return 'Debugging disabled'; }
function enableErrors() { errorEnabled = true; return 'Errors enabled'; }
function disableErrors() { errorEnabled = false; return 'Errors disabled'; }

console.log('Debugging on? ' + debugEnabled);
if (!debugEnabled) {
	console.log('Call enableDebug() to enable debugging, and disableDebug() to turn it off again');
}

console.log('Error reporting on? ' + errorEnabled);

if (!errorEnabled) {
	console.log('Call enableErrors() to enable error reporting, and disableErrors() to turn it off again');
}

var c = console;
var console = {
	log: function(str) {
		if (debugEnabled) {
			return c.log(str);
		} else {
			return false;
		}
	},
	warn: function(str) {
		if (debugEnabled) {
			return c.warn(str);
		} else {
			return false;
		}
	},
	error: function(str) {
		if (errorEnabled) {
			return c.error(str);
		} else {
			return false;
		}
	},
	debug: function(str) {
		if (debugEnabled) {
			return c.debug(str);
		} else {
			return false;
		}
	}
}

/**
* Set default badge contents
*
* Set badge colour
*/
console.debug('Configuring badge');
setBadge("");
setBadgeColour('green');

/**
* Returns a string of spaces to pad out
* the badge for a given string to pad it out
*/
function getSpacesForString(str)
{
	rtn = "";
	i = 7;
	while (i > (str.length*2)) {
		i--;
		rtn += " ";
	}
	return rtn;
}

/**
* Resets all the caches
*
* Periodically called from when the
* plugin is first loaded
*/
function clearCaches()
{
	console.warn('Clearing caches...');
	urls = new Array();
	console.warn('... done');
}

/**
* Sets the badge colour
*
* inputs are 'red', 'grey', 'green'
* defaults to green
*/
function setBadgeColour(colour, tabid)
{
	if (colour == 'red') {
		obj = {color: [255,0,0,255]}
		if (tabid) {
			obj.tabId = tabid;
		}
	} else if (colour == 'grey') {
		obj = {color: [192,192,192,255]}
		if (tabid) {
			obj.tabId = tabid;
		}
	} else {
		// go to green
		obj = {color: [149,200,62,255]}
		if (tabid) {
			obj.tabId = tabid;
		}
	}
	chrome.browserAction.setBadgeBackgroundColor(obj);
}

/**
* Strips useless anchors from URLs
*
* A useless anchor is a URL that doesn't
* contain a slash at any point after the anchor
*/
function stripAnchors(str)
{
	if (str.indexOf('#') >= 0) {
		// URL has an anchor in it
		anchor_section = str.substring(str.indexOf('#') + 1);
		if (anchor_section.indexOf('/') < 0) {
			/**
			* anchor section doesn't contain a /
			* so remove the anchor as TM will anyway
			*/
			str = str.substring(0, str.indexOf('#'));
			console.warn('Useless anchor found, URL shortened to "' + str + '"');
		} else {
			console.debug('Anchor found in URL but deemed to be useful, contains a /');
		}
	}

	return str;
}

/**
* Utility to set a badge string and
* automatically pad it correctly
*/
function setBadge(str, tabid)
{
	console.debug('Setting badge to contain "' + str + '"');
	obj = {text: getSpacesForString(str + "") + str};
	if (tabid) {
		obj.tabId = tabid;
	}
	chrome.browserAction.setBadgeText(obj);
}

/**
* Function to manage inserts into the
* cache, and displaying of the counts on to the
* button
*/
function cacheAndDisplay(url, count, windowid)
{
	console.debug('Caching count of "' + count + '" for url "' + url + '"');
	urls[url] = count;
	display(url, count, windowid);
}

/**
* Displays the count on the badge
* if it is for the correct url
*/
function display(url, count, windowid)
{
	chrome.windows.get(windowid, function(window) {
		chrome.tabs.getSelected(window.id, function(tab) {
			if (stripAnchors(tab.url) == url) {
				/**
				* If it is a cached error, then
				* don't display that - just return blank
				*/
				if (count == CACHE_ERROR) {
					count = '';
				}
				console.debug('URL "' + url + '" matches the current tab URL "' + tab.url + '" so updating badge to read "' + count + '"');
				newcount = parseInt(count);
				if (newcount) {
					if (newcount >= 1000000) {
						count = Math.round(newcount / 1000000) + 'M';
						console.log('Count of "' + newcount + '" modified to "' + count + '"');
					} else if (newcount >= 10000) {
						count = Math.round(newcount / 10000) + 'k';
						console.log('Count of "' + newcount + '" modified to "' + count + '"');
					}
				}
				setBadge(count, tab.id);
			} else {
				console.warn('URL "' + url + '" does not match the current tab URL "' + tab.url + '" so not updating the badge');
			}
		});
	});
}

/**
* Utility to help distinguish between which type
* of listener fired the update command
*
* In this case, it was onUpdated()
*/
function updateUpdated(tabID)
{
	console.debug('onUpdate listener activated with tab ID ' + tabID);
	update(tabID);
}

/**
* Utility to help distinguish between which type
* of listener fired the update command
*
* In this case, it was onSelectionChanged()
*/
function updateSelectionChanged(tabID)
{
	console.debug('onSelectionChanged listener activated with tab ID ' + tabID);
	update(tabID);
}

/**
* Main update function
*
* If the URL of the tab specified by tabID
* is valid and not already cached, it goes
* and retrieves the count from TM then passes
* it off for caching
*/
function update(tabID)
{
	console.debug('Updating count for tab "' + tabID + '"');

	chrome.tabs.get(tabID, function(tab) {
		/**
		* Get the URL of the tab
		*/
		var theurl = false;
		theurl = stripAnchors(tab.url);

		console.debug('Tab "' + tabID + '" has URL "' + theurl + '"');

		/**
		* First check the URL is valid (starts with "http://"),
		* then see if it is cached. If so, then just use that,
		* otherwise go to TweetMeme to get the data
		*/
		if (theurl.substring(0, 7) != "http://") {
			console.warn('URL doesn\'t start with "http://"');
			display(theurl, '', tab.windowId);
			setBadgeColour('grey', tabID);
		} else if (isBlacklisted(theurl.substring(7, theurl.substring(7).indexOf('/') + 7))) {
			// the domain has been blacklisted by the user
			console.warn(theurl.substring(7, theurl.substring(7).indexOf('/')) + ' is blacklisted by user');
			display(theurl, '', tab.windowId);
			setBadgeColour('red', tabID);
		} else if (urls[theurl]) {
			/**
			* The URL's count is stored in our local cache,
			* so use that value instead of hitting TweetMeme
			* again
			*/
			setBadgeColour('green', tabID);
			if (urls[theurl] == CACHE_ERROR) {
				console.warn('Cached error found');
				display(theurl, CACHE_ERROR, tab.windowId);
			} else {
				console.debug('Count of ' + urls[theurl] + ' found in cache, using that');
				display(theurl, urls[theurl], tab.windowId);
			}
		} else {
			/**
			* The URL is valid and not in our cache,
			* so hit TweetMeme to get the value
			*/
			setBadgeColour('green', tabID);
			console.debug('Valid URL and not in cache, so hitting TweetMeme for data on ' + theurl);

			/**
			* Blank it out while we make the request
			*/
			display(theurl, '', tab.windowId);

			var x = new XMLHttpRequest();

			/**
			* We build the response function here while
			* all the variables we need are in scope
			*/
			var response = function(e) {
				if (x.readyState == 4) {
					console.debug('State: LOADED for HTTP request for "' + theurl + '"');
					data = eval('(' + x.responseText + ')');
					setBadgeColour('green', tabID);
					if (data.status == "success") {
						/**
						* Data returned was ok, so cache it and then display
						*/
						cacheAndDisplay(theurl, data.url_count, tab.windowId);
					} else {
						/**
						* Error returned, so cache that as well so we don't
						* cause massive load
						*/
						cacheAndDisplay(theurl, CACHE_ERROR, tab.windowId);
					}
				} else if (x.readyState == 3) {
					console.debug('State: RECEIVING for HTTP request for "' + theurl + '"');
				} else if (x.readyState == 2) {
					console.debug('State: SENT for HTTP request for "' + theurl + '"');
				} else if (x.readyState == 1) {
					console.debug('State: OPEN for HTTP request for "' + theurl + '"');
				} else if (x.readyState == 0) {
					console.debug('State: UNITIALISED for HTTP request for "' + theurl + '"');
				}
			}

			/**
			* Register the callback and dispatch the request
			*/
			x.onreadystatechange = response;
			x.open('GET', 'http://api.tweetmeme.com/v2/addons/bar.json?url=' + encodeURI(theurl), true);
			x.send(null);
		}
	});
}

/**
* Sets up the listeners for when a tab is changed
* or updated - we need to see if we have a new URL
*/
chrome.tabs.onUpdated.addListener(updateUpdated);
chrome.tabs.onSelectionChanged.addListener(updateSelectionChanged);
console.debug('Listeners attached');
