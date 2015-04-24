module.exports = function(appInfo, https, xml2jsParser, nodeOnly, util) {
    var grURLs = {},
        goodReadsCallQueue = [],
        goodReadsCallStates = {
            waiting: 0,
            active: 1
        },
        goodReadsCallState = goodReadsCallStates.waiting, // this can have one of three
        lastGoodReadsCallTime = 0,
        httpsOptions = {
            host: 'www.goodreads.com',
            port: 443
        };

    function requestGoodReadsResource(path, callback) {
        console.log('requestGoodReadsResource path: ' + path);
        var requestInfo = {
            "callback": callback,
            "path": path
        };
        goodReadsCallQueue.push(requestInfo);
        // good reads terms of use state that no more than one call per second can take place
        // if something is not happening then start the calls
        if (goodReadsCallQueue.length === 1 && goodReadsCallState === goodReadsCallStates.waiting) { // no call is happening
            makeGoodReadsCall();
        }
    }

    function makeGoodReadsCall() {
        goodReadsCallState = goodReadsCallStates.active;
        lastGoodReadsCallTime = new Date().getTime();
        var requestInfo = goodReadsCallQueue.shift();
        httpsOptions.path = requestInfo.path;
        //this is the call
        request = https.get(httpsOptions, function(httpsResponse) {
            var userXml = "";
            httpsResponse.on('data', function(data) {
                userXml += data;
            });
            httpsResponse.on('end', function() {
                xml2jsParser.parseString(userXml, function(err, result) {
                    requestInfo.callback(result['GoodreadsResponse']);
                    if (goodReadsCallQueue.length > 0) { // there is a call waiting to happen
                        var numMillisecondsBetweenCalls = 1000,
                            timeSinceLastCall = new Date().getTime() - lastGoodReadsCallTime;
                        if (timeSinceLastCall > numMillisecondsBetweenCalls) {
                            makeGoodReadsCall();
                        } else {
                            setTimeout(numMillisecondsBetweenCalls - timeSinceLastCall, makeGoodReadsCall)
                        }
                    } else {
                        goodReadsCallState = goodReadsCallStates.waiting;
                    }
                });
            })
            httpsResponse.on('error', function(e) {
                console.log("Got error: " + e.message);
            });
        });
    }

    var getUserInfo = function(req, res) {
            //console.log('getUserInfo: req: ' + util.inspect(req));
        requestGoodReadsResource('/user/show/' + req.user + '.xml?key=' + appInfo.key, function(jsonData) {
            console.log('getUserInfo: user data: ' + util.inspect(jsonData));
            console.log('user: ' + util.inspect(jsonData));
            if (nodeOnly === true) {
                res.render('userInfo', {
                    response: jsonData
                });
                return;
            }
            res.send(jsonData);
        });
    };

// URL: https://www.goodreads.com/review/list.xml?v=2    (sample url) 
// HTTP method: GET 
// Parameters: 
// v: 2
// id: Goodreads id of the user
// shelf: read, currently-reading, to-read, etc. (optional)
// sort: title, author, cover, rating, year_pub, date_pub, date_pub_edition, date_started, date_read, date_updated, date_added, recommender, avg_rating, num_ratings, review, read_count, votes, random, comments, notes, isbn, isbn13, asin, num_pages, format, position, shelves, owned, date_purchased, purchase_location, condition (optional)
// search[query]: query text to match against member's books (optional)
// order: a, d (optional)
// page: 1-N (optional)
// per_page: 1-200 (optional)
// key: Developer key (required).
    var shelfInfo = function(req, res) {
        var pageNum = req.query.pageNum,
            shelfName = req.query.shelfName;
        requestGoodReadsResource('/review/list/' + req.user + '.xml?key=' + appInfo.key + '&page=' + pageNum + '&shelf=' + shelfName, function(jsonData) {
            if (nodeOnly === true) {
                res.render('shelfInfo', {
                    response: jsonData,
                    name: shelfName
                });
                return;
            }
            res.send(jsonData);
        });
    };

    var bookInfo = function(req, res) {
        var bookId = req.query.bookId;
        requestGoodReadsResource('/book/show/' + bookId + '.xml?key=' + appInfo.key, function(jsonData) {
            if (nodeOnly === true) {
                res.render('bookInfo', {
                    response: jsonData
                });
                return;
            }
            res.send(jsonData);
        });
    };

    var seriesInfo = function(req, res) {
        var seriesId = req.query.seriesId;
        requestGoodReadsResource('/series/' + seriesId + '?key=' + appInfo.key, function(jsonData) {
            if (nodeOnly === true) {
                res.render('seriesInfo', {
                    response: jsonData
                });
                return;
            }
            res.send(jsonData);
        });
    };

    var getSeriesToFinish = function(req, res) {
        requestGoodReadsResource('/series/' + seriesId + '?key=' + appInfo.key, function(jsonData) {
            res.send(jsonData);
        });
    };

    return {
        GetUserInfo: getUserInfo,
        ShelfInfo: shelfInfo,
        BookInfo: bookInfo,
        SeriesInfo: seriesInfo,
        GetSeriesToFinish: getSeriesToFinish
    };
};