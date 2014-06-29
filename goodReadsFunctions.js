module.exports = function(appInfo, https, xml2jsParser, nodeOnly)
{
  var grURLs = {

  },
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
    var requestInfo = {
      "callback": callback,
      "path": path
    };

    goodReadsCallQueue.push(requestInfo);

    // good reads terms of use state that no more than one call per second can take place
    // if something is not happening then start the calls
    if(goodReadsCallQueue.length === 1 && goodReadsCallState === goodReadsCallStates.waiting) { // no call is happening
      makeGoodReadsCall();
    }
  }

  function makeGoodReadsCall () {
    goodReadsCallState = goodReadsCallStates.active;
    lastGoodReadsCallTime = new Date().getTime();
    var requestInfo = goodReadsCallQueue.shift();
    httpsOptions.path = requestInfo.path;
    //this is the call
    request = https.get(httpsOptions, function(httpsResponse){
      var userXml = "";
      httpsResponse.on('data', function(data) {
        userXml += data;
      });

      httpsResponse.on('end', function() {
        xml2jsParser.parseString(userXml, function(err, result){
          requestInfo.callback(result['GoodreadsResponse']);

          if(goodReadsCallQueue.length > 0) { // there is a call waiting to happen
            var numMillisecondsBetweenCalls = 1000,
              timeSinceLastCall = new Date().getTime() - lastGoodReadsCallTime;

            if(timeSinceLastCall > numMillisecondsBetweenCalls) {
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
    requestGoodReadsResource('/user/show/' + req.user.id + '.xml?key=' + appInfo.key, function (jsonData) {
      if(nodeOnly === true) {
        res.render('userInfo', { response: jsonData });
        return;
      }

      res.send(jsonData);
    });
  };

  var shelfInfo = function(req, res) {
    var pageNum = req.query.pageNum,
      shelfName = req.query.shelfName;

    requestGoodReadsResource('/review/list/' + req.user.id + '.xml?key=' + appInfo.key + '&page=' + pageNum + '&shelf=' + shelfName, function (jsonData) {
      if(nodeOnly === true) {
        res.render('shelfInfo', { response: jsonData, name: shelfName });
        return;
      }

      res.send(jsonData);
    });
  };

  var bookInfo = function(req, res) {
    var bookId = req.query.bookId;

    requestGoodReadsResource('/book/show/' + bookId + '.xml?key=' + appInfo.key, function (jsonData) {
      if(nodeOnly === true) {
        res.render('bookInfo', { response: jsonData });
        return;
      }

      res.send(jsonData);
    });
  };

  var seriesInfo = function (req, res) {
    var seriesId = req.query.seriesId;

    requestGoodReadsResource('/series/' + seriesId + '?key=' + appInfo.key, function (jsonData) {
      if(nodeOnly === true) {
        res.render('seriesInfo', { response: jsonData });
        return;
      }

      res.send(jsonData);
    });
  };

  var getSeriesToFinish = function (req, res) {

    requestGoodReadsResource('/series/' + seriesId + '?key=' + appInfo.key, function (jsonData) {

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
