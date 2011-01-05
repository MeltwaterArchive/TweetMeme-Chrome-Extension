/**
* globally stores the URL ID for this URL
*/
var url_id = null;

/*
* TJAX is a TweetMeme internal lib that is used in the tweeting action
*/
var Tjax = Class.create();
Tjax.Request = Class.create(Tjax, {
	initialize: function(url, options, callback, failure) {
		var defaults = {
			onSuccess: function(transport) {
			    this.response(transport, callback, failure);
			}.bind(this),
			onFailure: function(transport) {

				Object.extend(transport, {
					success: callback,
					failure: failure
				});

				failure(transport);
			}
		}
		Object.extend(options, defaults);
		new Ajax.Request(url, options);
	},

	response: function(transport, callback, failure) {

		Object.extend(transport, {
			success: callback,
			failure: failure
		});

		var json = transport.responseText.evalJSON();
		if (json['response'] == 'success') {
			if (callback) {
				callback(json['data']);
			}
		} else {
			if (failure) {
				failure(transport, json['data']);
			} else {
				new Popup(json['data']);
			}
		}
	}
});

/**
* Given a TweetMeme URL for a story, it extracts its URL ID
*/
function extractId(str)
{
	return str.substring(str.lastIndexOf('/') + 1);
}

/**
* Formats a tweet from the title of a page and the RT section, leaving space for the
* later-appended short URL
*/
function formatTweet(title)
{
	var count = 140;
	var tweet = "";
	count -= "http://retwt.me/111111".length;

	if (title.length > count) {
		title = title.substring(0, count - 2) + "..";
	}
	tweet += title;

	return tweet;
}

function error(msg)
{
	$("form").hide();
	$("controls").hide();
	$("tweet").insert('<div style="width: 100%; height: 150px; background-color: #fff; text-align: center;"><div style="color: #f00; font-size: 20px; margin: 10px 0px 5px;">Error</div><div>' + msg + '</div></div><div class="controls"><a class="btn" href="#" target="" onClick="window.close();" id="no">Close</a>').show();
}

/**
* Binds these events to the page loader
*/
document.observe("dom:loaded", function() {

	console.log('DOM loaded, hiding contents');

	/**
	* Hides the content of the window so we see the loading
	* spinner while we make the asynchronous requests
	*/
	$("tweet").hide();

	/**
	* Here we start the process of retrieving the URL of the tab
	* we are currently looking at
	*
	* Get the window that we are currently in
	*/
	chrome.windows.getCurrent(function(window) {

		/**
		* Now grab the tab that we are looking at
		*/
		chrome.tabs.getSelected(window.id, function(tab) {

			console.log('Retrieved tab URL of "' + tab.url + '"');

			/**
			* We have the tab's URL now.
			*
			* Check that it starts with HTTP. Otherwise, we don't
			* render a popup for it at all
			*/
			if (tab.url.substring(0, 7) == "http://") {

				console.log('Asking TweetMeme for data...');

				/**
				* Make an async request to TweetMeme for the url info for the URL.
				*
				* This will force TweetMeme to resolve it and provide a title if
				* it doesn't exist on TweetMeme already.
				*/
				language = localStorage["language"];
				if (language==undefined) {
					language = "";
					localStorage["language"] = "";
				}
				console.log("Translation: '" + language + "'");

				new Ajax.Request("http://api.tweetmeme.com/v2/buildTweet.json?translate=" + language + "&url=" + tab.url,
					{
						/**
						* Successful response
						*/
						onSuccess: function(transport) {
							console.log('Data received...');
							/**
							* Convert the response into a JS object and
							* check TweetMeme didn't return an error
							*/
							data = transport.responseText.evalJSON();
							if (data.status == "success") {
								console.log('Data is valid.');

								/**
								* Update the tweet text box with the RT and title
								*/
								$("tweettext").update(formatTweet(data.tweet));
								$("tweet").show();

								console.log('Getting "More" link...');

								/**
								* Hit TweetMeme for the URL ID
								*/
								new Ajax.Request("http://api.tweetmeme.com/url_info.json?url=" + tab.url,
									{
										/**
										* Successful response
										*/
										onSuccess: function(transport) {
											console.log('URL Info data received..');
											/**
											* Convert response to JS object and make sure
											* there's no error
											*/
											data = transport.responseText.evalJSON();
											if (data.status == 'success') {
												console.log('Data from URL Info is valid.');
												/**
												* Globally set the URL ID data
												*/
												url_id = extractId(data.story.tm_link);
												console.log('URL ID is ' + url_id);
												$("id").writeAttribute('value', url_id);
												/**
												* Create the "More" link and display it
												*/
												$('userbox').insert('<a href="http://tweetmeme.com/story/' + url_id + '" onclick="javascript:window.close();" target="_blank" style="font-size: 10px; color: #999; text-decoration: underline;" id="morelink">More</a>');

											} else {
												console.log('Failed to obtain data from TweetMeme');
											}
										},

										/**
										* Errored response
										*/
										onFailure: function(transport) {
											console.log('Error receiving data from URL Info');
										}
									}
								);
							} else {
								/**
								* TweetMeme returned an error
								*/
								error("Error retrieving data from TweetMeme");
							}
						}.bind(this),

						/**
						* Errored response
						*/
						onFailure: function(transport) {
							console.log('Error receiving data from TweetMeme');
							error("Error retrieving data from TweetMeme");
						}
					}
				);
			} else {
				/**
				* The tab doesn't start "http://", so display an error
				*/
				console.error('Tab does not contain a valid URL');
				error("This tab does not contain a valid URL");
			}
		});

	});

	$('yes').observe('click', function(e) {
		e.stop();
		console.log('Attempting to tweet...');
		// add the loading class
		$('yes').addClassName('loading');
		// build up the post body
		var body = 'url_id=' + $F('id');
		// tweettext
		body += '&tweet=' + encodeURIComponent($F('tweettext'));
		// advert id
		body += '&advertid=' + $F('advertid');
		// send off a new request
		new Tjax.Request('http://tweetmeme.com/ajax/tweet', {
			postBody: body
		}, function() {
			console.log('Tweet successfully dispatched');
			$('yes').removeClassName('loading');
			// close the window
			window.close();
		}.bind(this), function(data) {
			$('yes').removeClassName('loading');
			// we have a failure do something with it
			var data = data.responseText.evalJSON();
			// remove the old elements
			$('form').select('.feedback').invoke('remove');
			// create a new element
			if (data.data == 'Authorization error. Please try again.') {
				console.error('Authorisation error');
				data.data = 'Please <a href="http://tweetmeme.com/auth/login" onClick="window.close();" target="_blank">Log In to TweetMeme</a> and try again.';
			} else {
				console.log('Other error - "' + data.data + '"');
			}
			var error = new Element('div', {'class':'feedback'}).update(data.data);
			// add the element into the page
			$('tweettext').up().insert({before:error});
			// resize the window
			window.resizeTo(500,245);
		}.bind(this));
	}.bind(this));

	// bind the no button
	$('no').observe('click', function() {
		console.log('Closing...');
		$("body").empty();
	});

});