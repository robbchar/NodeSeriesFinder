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
  // used for goodsread oauth
  passport = require('passport'),
  GoodreadsStrategy = require('passport-goodreads').Strategy,
  port = 8000,
  host = '127.0.0.1',
  httpsOptions = {
        host: 'www.goodreads.com',
        port: 443
      },
  // oauth urls
  // request_token_url = 'http://goodreads.com/oauth/request_token',
  // authorize_url = 'http://goodreads.com/api/auth_user',
  // access_token_url = 'http://goodreads.com/oauth/access_token',
  // app info
  appInfo = {
    name: 'SeriesFinder',
    key: 'qWqSov4tZxgcRuMjoabsg',
    secret: 'eLcDMc54u9w4bryXiyXNOlbDUMGB8bZpbla87LYrI'
  },
  // oauth tokens
  oauthAccessToken = undefined,
  oauthAccessTokenSecret = undefined;

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
  res.render('index', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
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
    httpsOptions.path = '/user/show/' + req.user.id + '.xml?key=' + appInfo.key;

    requestResource(function (jsonData) {
      res.render('userInfo', { response: jsonData });
    });
  }
);

app.get('/shelfInfo',
  ensureAuthenticated,
  function(req, res) {
    var pageNum = req.query.pageNum,
      shelfName = req.query.shelfName;

    httpsOptions.path = '/review/list/' + req.user.id + '.xml?key=' + appInfo.key + '&page=' + pageNum + '&shelf=' + shelfName;

    requestResource(function (jsonData) {
      res.render('shelfInfo', { response: jsonData, name: shelfName });
    });
  }
);

app.get('/bookInfo',
  ensureAuthenticated,
  function(req, res) {
    var bookId = req.query.bookId;
    httpsOptions.path = '/book/show/' + bookId + '.xml?key=' + appInfo.key;

    requestResource(function (jsonData) {
      res.render('bookInfo', { response: jsonData });
    });
  }
);

app.get('/seriesInfo',
  ensureAuthenticated,
  function(req, res) {
    var seriesId = req.query.seriesId;

    httpsOptions.path = '/series/' + seriesId + '?key=' + appInfo.key;

    requestResource(function (jsonData) {
      res.render('seriesInfo', { response: jsonData });
    });
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

function requestResource(callback) {
  //this is the call
  request = https.get(httpsOptions, function(httpsResponse){
    var userXml = "";
    httpsResponse.on('data', function(data) {
      userXml += data;
    });

    httpsResponse.on('end', function() {
      xml2jsParser.parseString(userXml, function(err, result){
        callback(result['GoodreadsResponse']);
      });
    })

    httpsResponse.on('error', function(e) {
      onsole.log("Got error: " + e.message);
    });
  });
}
