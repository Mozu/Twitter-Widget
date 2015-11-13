define(['modules/jquery-mozu', 'vendor/codebird'],
    function ($) {

        /**
            Instantiation of Twitter Client
        **/

        var TwitterClient = function(username) {
            this.widgetDataKey = 'twitter-feed-json';
            this.widgetData = this.getWidgetData();
            this.username = username || this.widgetData.userName;
            this.credentials = this.getCredentials();
            this.codebird = new Codebird();
            this.$feedContainer = $('.custom-widget-twitter-feed .feed');
            this.$loader = $('.custom-widget-twitter-feed .loading');
            this.authenticate();
        };

        /**
            A method for holding user credentials
        **/

        TwitterClient.prototype.getCredentials = function() {

            switch (this.username) {
                case 'USER_NAME':
                    return {
                        consumerKey: 'YOUR_CONSUMER_KEY',
                        consumerSecret: 'YOUR_CONSUMER_SECRET',
                        accessToken: 'YOUR_ACCESS_TOKEN',
                        accessTokenSecret: 'YOUR_ACCESS_TOKEN_SECRET'
                    };
                case 'OTHER_USER':
                    return {
                        consumerKey: 'YOUR_CONSUMER_KEY',
                        consumerSecret: 'YOUR_CONSUMER_SECRET',
                        accessToken: 'YOUR_ACCESS_TOKEN',
                        accessTokenSecret: 'YOUR_ACCESS_TOKEN_SECRET'
                    };
                default:
                    throw new Error('This user hasn\'t been defined!');
            }
        };

        /**
            Authenticating Twitter Client
        **/

        TwitterClient.prototype.authenticate = function() {
            this.codebird.setConsumerKey(this.credentials.consumerKey, this.credentials.consumerSecret);
            this.codebird.setToken(this.credentials.accessToken, this.credentials.accessTokenSecret);
        };

        TwitterClient.prototype.doQuery = function() {
            var query;

            if (this.widgetData.retweets) {
                query = this.widgetData.query;
            }

            else {
                query = this.widgetData.query + ' -filter:retweets';
            }

            if (!this.widgetData.links) {
                query = query + ' -filter:links';
            }

            if (!this.widgetData.images) {
                query = query + ' -filter:images';
            }

            if (!this.widgetData.replies) {
                query = query + ' -filter:replies';
            }

            this.codebird.__call(
                'search_tweets',
                'q=' + query + '&include_entities=true',
                (function (reply, rate, err) {

                    if (err) throw new Error('There was an error retrieving Twitter data. Please check to make sure credentials and query are valid');

                    if (reply) this.handleTwitterFeed(reply);

                }).bind(this)
            );
        };

        TwitterClient.prototype.handleTwitterFeed = function(twitterData) {
            if (twitterData.httpstatus !== 200) console.warn('Twitter HTTP Status = ' + twitterData.httpstatus);

            this.createTwitterCards(twitterData.statuses);
        };

        TwitterClient.prototype.getWidgetData = function() {
            /**
             * Mozu Widget Pattern -- grab the DOM where we've dumped out the widget configuration
             * so it can be accessed dynamically by JavaScript
             */
            return $('[data-' + this.widgetDataKey + ']').data(this.widgetDataKey);
        };

        TwitterClient.prototype.createTwitterCards = function(tweets) {
            var $container = $('<div>'),
                $card;

            tweets.forEach(function(tweet) {
                $card = this.getCard(tweet);
                $container.append($card);
            }, this);

            this.$loader.remove();

            this.$feedContainer.append($container);
        };

        TwitterClient.prototype.findText = function (richText, prop) {
            return richText.search(new RegExp(prop, 'i'));
        };

        TwitterClient.prototype.getCard = function(tweet) {

            var richText = tweet.text,
                urls = tweet.entities.urls,
                users = tweet.entities.user_mentions,
                hashtags = tweet.entities.hashtags;

            /**
             * Removes RT link to original tweet
             */
            if (richText.indexOf('RT') === 0 && richText.lastIndexOf('https') > 0) {
                richText = richText.substring(0, richText.lastIndexOf('https'));
            }

            /**
             * Removes link to original tweet
             */
            // if (tweet.entitties.hasOwnProperty(media)) {
            //     if (richText.search(new RegExp(tweet.entities.media.url, "i"))) {
            //         richText = richText.substring(0, richText.search(new RegExp(tweet.entities.media.url, "i")));
            //     }
            // }

            /**
             * Hyperlinks URLs
             */

            if (urls.length > 0) {

                urls.forEach(function(url) {
                    var linkText = url.url;

                    if (this.findText(richText, linkText) > 0 ) {

                        var linkedText = '<a href="' + url.url + '" target="_blank">' + linkText + '</a>';
                        var richTextLeft = richText.substring(0, this.findText(richText, linkText));
                        var richTextRight = richText.substring(this.findText(richText, linkText) + linkText.length, richText.length);

                        if (this.findText(richText, linkText)) {
                            richText = richTextLeft + linkedText + richTextRight;
                        } else {
                            richText = linkedText + richTextRight;
                        }

                    }
                });
            }

            /**
             * Hyperlinks handles
             */

            if (users.length > 0) {

                users.forEach(function(user) {
                    var userName = '@' + user.screen_name;

                    if (this.findText(richText, userName) > 0) {

                        var linkedUser = ['<a href="https://twitter.com/', user.screen_name, '" target="_blank">', userName, '</a>'].join('');
                        var richTextLeft = richText.substring(0, this.findText(richText, userName));
                        var richTextRight = richText.substring(this.findText(richText, userName) + userName.length, richText.length);

                        if (this.findText(richText, userName)) {
                            richText = richTextLeft + linkedUser + richTextRight;
                        } else {
                            richText = linkedUser + richTextRight;
                        }

                    }
                }, this);
            }

            /**
             * Hyperlinks hashtags
             */
            if (hashtags.length > 0) {

                hashtags.forEach(function(hashtag) {
                    var tagText = '#' + hashtag.text;

                    if (richText.indexOf(tagText) > -1) {

                        var linkedTag = ['<a href="https://twitter.com/hashtag/', hashtag.text, '?src=hash" target="_blank">', tagText, '</a>'].join('');
                        var richTextLeft = richText.substring(0, richText.indexOf(tagText));
                        var richTextRight = richText.substring(richText.indexOf(tagText) + tagText.length, richText.length);

                        if (richText.indexOf(tagText)) {
                            richText = richTextLeft + linkedTag + richTextRight;
                        } else {
                            richText = linkedTag + richTextRight;
                        }

                    }
                });
            }

            var card = $('<div>').attr('class', 'card'),
                bg = $('<div>').attr('class', 'user-bg'),
                img = $('<img>', { src: tweet.user.profile_image_url }).attr('class', 'user-img'),
                linkedImg = $('<a>').attr({
                                        'href': 'https://twitter.com/' + tweet.user.screen_name,
                                        'target': '_blank',
                                        'class': 'img-link'
                                    }).html(img),
                tweetText = $('<span>').attr('class', 'user-text').html(richText),
                tweetContainer = $('<div>').attr('class', 'user-tweet'),
                cardLeft;

            if (!this.widgetData.profilepicture && !this.widgetData.background) {

                $(tweetContainer).attr('class', 'user-tweet no-img')
                                 .html(tweetText);

                card.html(tweetContainer);

            } else if (!this.widgetData.profilepicture) {

                $(card).attr({
                    'class': 'card',
                    'style': 'background-image: url(' + tweet.user.profile_background_image_url + '); background-size: cover;'
                });

                $(tweetContainer).attr('class', 'user-tweet with-img')
                                 .html(tweetText);
                cardLeft = bg;
                card.html(cardLeft)
                    .append(tweetContainer);

            } else if (!this.widgetData.background) {

                $(linkedImg).attr('class', 'user-img lone-img');
                $(tweetText).attr('class', 'user-text profile-img');
                $(tweetContainer).attr('class', 'user-tweet profile-img')
                                 .html(linkedImg)
                                 .append(tweetText);

                card.html(tweetContainer);

            } else if (this.widgetData.profilepicture && this.widgetData.background) {

                $(card).attr({
                    'class': 'card',
                    'style': 'background-image: url(' + tweet.user.profile_background_image_url + '); background-size: cover;'
                });

                cardLeft = bg.html(linkedImg);
                $(tweetContainer).attr('class', 'user-tweet with-img')
                                 .html(tweetText);

                card.html(cardLeft)
                    .append(tweetContainer);
            }

            return card;

        };

        var twitterClient = new TwitterClient('USER_NAME');

        twitterClient.doQuery();
    }
);