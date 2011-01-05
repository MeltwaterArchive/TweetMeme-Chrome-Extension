/**
* Handles processing the form adding a
* domain to the blacklist
*/
function processAddToBlacklist()
{
	myObj = document.getElementById('blacklist_input');
	value = myObj.value.replace(/^\s+|\s+$/g,"");

	if (value == '') {
		alert('Please enter a value');
		return;
	}

	if (value.indexOf('.') < 0) {
		alert('Please enter a valid domain name');
		return;
	}

	addToBlacklist(value);
	updateBlacklistOutput();

	myObj.value = '';
}

function processRemoveFromBlacklist(domain)
{
	removeFromBlacklist(domain);
	updateBlacklistOutput();
}

/**
* Updates the rendering of the current blacklist
*/
function updateBlacklistOutput()
{
	o = document.getElementById('domains');
	o.innerHTML = '';

	blacklist = getBlacklist();

	for (i in blacklist) {
		if (blacklist[i] === true) {
			o.innerHTML = o.innerHTML + '<li><span>' + i + '</span><button onclick="processRemoveFromBlacklist(\'' + i + '\');" class="rbtn">X</button></li>';
		}
	}
}

/**
* Called when lang dropdown is changed to save the lang code
*/
function updateLang()
{
	langbox = document.getElementById('lang');
	localStorage["language"] = langbox.value;
}

/**
* Populates the language dropdown with the right option
*/
function selectLang()
{
	lang = localStorage["language"];
	if (lang!=undefined) { // a lang is defined
		document.getElementById('lang').value = lang;
	}
}