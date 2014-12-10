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
  // New Code
  mongo = require('mongodb'),
  monk = require('monk'),
  db = monk('localhost:27017/goodreads'),
  // is the nodeOnly argument passed in
  nodeOnly = (process.argv.indexOf('nodeOnly') > -1),
  // app info, configguration data
  appInfo = require('./appInfo.json'), // this includes the keys for good reads
  GRapi = require('./goodReadsFunctions.js')(appInfo, https, xml2jsParser, nodeOnly), // good reads api functions
  port = 8000,
  host = '127.0.0.1',
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
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({
  secret: "skjghskdjfhbqigohqdiouk", 
  saveUninitialized: true,
  resave: true
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
  GRapi.GetUserInfo
);

app.get('/shelfInfo',
  ensureAuthenticated,
  GRapi.ShelfInfo
);

app.get('/bookInfo',
  ensureAuthenticated,
  GRapi.BookInfo
);

app.get('/seriesInfo',
  ensureAuthenticated,
  GRapi.SeriesInfo
);

app.get('/getSeriesToFinish',
  ensureAuthenticated,
  GRapi.GetSeriesToFinish
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
