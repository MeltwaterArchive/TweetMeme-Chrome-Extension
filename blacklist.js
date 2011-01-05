/**
* Defines some global variables
*/
var BLACKLIST_NAME = 'tm_btn_blacklist';

/**
* Returns a boolean whether or not the domain
* is blacklisted
*/
function isBlacklisted(domain)
{
	blacklist = getBlacklist();

	if (blacklist) {
		subdomains = domain.split('.');
		while (subdomains.length > 0) {
			d = subdomains.join('.');
			if (blacklist[d] === true) {
				return true;
			}
			subdomains.shift();
		}
	}
	return false;
}

/**
* returns the current blacklist
*/
function getBlacklist()
{
	obj = localStorage[BLACKLIST_NAME];
	if (obj) {
		return JSON.parse(obj);
	}
	return {};
}

/**
* Saves some data back to the blacklist
*/
function saveBlacklist(data)
{
	if (!data) {
		data = {};
	}
	localStorage[BLACKLIST_NAME] = JSON.stringify(data);
}

/**
* Utility to modify a value for the blacklist
*/
function setBlacklistValue(domain, value)
{
	blacklist = getBlacklist();

	if (!blacklist) {
		blacklist = {};
	}

	if (value == null) {
		delete blacklist[domain];
	} else {
		blacklist[domain] = value;
	}

	saveBlacklist(blacklist);
}

/**
* Add a URL to the blacklist
*/
function addToBlacklist(domain)
{
	setBlacklistValue(domain, true);
}

/**
* Removes an item from the blacklist
*/
function removeFromBlacklist(domain)
{
	setBlacklistValue(domain, null);
}