var stringSimilarity = require('string-similarity');
var RtmClient = require('slack-client').RtmClient;
var WebClient = require('slack-client').WebClient;
var token = 'Your Access Token';

var request = require('request');
var async = require('async');
var cheerio = require('cheerio');

var baseurl = 'http://section.blog.naver.com/sub/SearchBlog.nhn?type=post&option.keyword=%EC%96%B4%EC%9D%80%EB%8F%99%20%EB%A7%9B%EC%A7%91&term=&option.startDate=&option.endDate=&option.page.currentPage={{page}}&option.orderBy=sim';
var search = function (end, page, result) {
    if (!page) page = 1;
    if (!result) result = [];

    var url = baseurl.replace('{{page}}', page);

    async.waterfall([
        function (callback) {
            request.get({
                url: url
            }, function (err, res, html) {
                if (err)
                    return callback(err);
                var $ = cheerio.load(html);
                callback(null, $);
            });
        },
        function ($, callback) {
            $('.search_list li h5 a').each(function () {
                result.push({title: $(this).text().trim(), href: $(this).attr('href')});
            });
            callback(null);
        }
    ], function () {
        if (page >= 5) {
            function shuffle(array) {
                var currentIndex = array.length, temporaryValue, randomIndex;
                while (0 !== currentIndex) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;
                    temporaryValue = array[currentIndex];
                    array[currentIndex] = array[randomIndex];
                    array[randomIndex] = temporaryValue;
                }
                return array;
            }

            result = shuffle(result);

            var random_pick = [];
            var idx = 0;
            while (random_pick.length < 1) {
                if (result[idx].title.length > 0) {
                    random_pick.push(result[idx]);
                }
                idx++;
            }

            end(random_pick);
        } else {
            search(end, page + 1, result);
        }
    });
};

var web = new WebClient(token);
var rtm = new RtmClient(token, {logLevel: 'error'});
rtm.start();

var RTM_EVENTS = require('slack-client').RTM_EVENTS;
rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    var channel = message.channel;
    var user = message.user;
    var text = message.text;

    var detecting = ['배고파', '배고픔', '뭐먹을까', '뭐먹지', '저녁', '점심', '맛집 추천', '식사', '식사 추천', ' 저녁 추천'];
    var matches = stringSimilarity.findBestMatch(text, detecting).bestMatch;
    if (matches.rating < 0.5) return;

    search(function (result) {
        var resp = '<' + result[0].href + '|' + result[0].title + '>';
        web.chat.postMessage(channel, resp, {username: "noticebot"});
    });