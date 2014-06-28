var express = require('express'),
  app = express(),
  util = require('util'),
  OAuth = require('oauth').OAuth,
  querystring = require('querystring'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  xml2jsParser = require('xml2js').Parser(),
  methodOverride = require('method-override'),
  https = require('https'),
  // used for goodreads oauth
  passport = require('passport'),
  GoodreadsStrategy = require('passport-goodreads').Strategy,
  // app info
  appInfo = require('./appInfo.json'), // this includes the keys for good reads
  // is the nodeOnly argument passed in
  nodeOnly = (process.argv.indexOf('nodeOnly') > -1)
  port = 8000,
  host = '127.0.0.1',
  // host = '54.191.4.199', //AWS
  httpsOptions = {
        host: 'www.goodreads.com',
        port: 443
      },
  // oauth tokens
  oauthAccessToken = undefined,
  oauthAccessTokenSecret = undefined,
  goodReadsCallQueue = [],
  goodReadsCallStates = {
    waiting: 0,
    active: 1
  },
  goodReadsCallState = goodReadsCallStates.waiting, // this can have one of three
  lastGoodReadsCallTime = 0;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Goodreads profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the GoodreadsStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Goodreads profile), and
//   invoke a callback with a user object.
passport.use(new GoodreadsStrategy({
  clientID: appInfo.name,
  consumerKey: appInfo.key,
  consumerSecret: appInfo.secret,
  callbackURL: "http://" + host + ":" + port + "/auth/goodreads/callback"
},

function(token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {

      // To keep the example simple, the user's Goodreads profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Goodreads account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({
  secret: "skjghskdjfhbqigohqdiouk"
}));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.listen(port);
util.log('Listening on port ' + port);

// Handlers
// Home Page
app.get('/', function(req, res){
  if(nodeOnly === true) {
    res.render('index', { user: req.user });
  }
});

app.get('/login', function(req, res){
  if(nodeOnly === true) {
    res.render('login', { user: req.user });
  }
});

app.get('/auth/goodreads',
  passport.authenticate('goodreads'),
  function(req, res){
    // The request will be redirected to Goodreads for authentication, so this
    // function will not be called.
  }
);

app.get('/auth/goodreads/callback',
  passport.authenticate('goodreads', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/userInfo',
  ensureAuthenticated,
  function(req, res) {

    requestGoodReadsResource('/user/show/' + req.user.id + '.xml?key=' + appInfo.key, function (jsonData) {
      if(nodeOnly === true) {
        res.render('userInfo', { response: jsonData });
        return;
      }

      res.send(jsonData);
    });
  }
);

app.get('/shelfInfo',
  ensureAuthenticated,
  function(req, res) {
    var pageNum = req.query.pageNum,
      shelfName = req.query.shelfName;

    requestGoodReadsResource('/review/list/' + req.user.id + '.xml?key=' + appInfo.key + '&page=' + pageNum + '&shelf=' + shelfName, function (jsonData) {
      if(nodeOnly === true) {
        res.render('shelfInfo', { response: jsonData, name: shelfName });
        return;
      }

      res.send(jsonData);
    });
  }
);

app.get('/bookInfo',
  ensureAuthenticated,
  function(req, res) {
    var bookId = req.query.bookId;

    requestGoodReadsResource('/book/show/' + bookId + '.xml?key=' + appInfo.key, function (jsonData) {
      if(nodeOnly === true) {
        res.render('bookInfo', { response: jsonData });
        return;
      }

      res.send(jsonData);
    });
  }
);

app.get('/seriesInfo',
  ensureAuthenticated,
  function(req, res) {
    var seriesId = req.query.seriesId;

    requestGoodReadsResource('/series/' + seriesId + '?key=' + appInfo.key, function (jsonData) {
      if(nodeOnly === true) {
        res.render('seriesInfo', { response: jsonData });
        return;
      }

      res.send(jsonData);
    });
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

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
      onsole.log("Got error: " + e.message);
    });
  });
}
