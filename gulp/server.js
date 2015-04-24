'use strict';

var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    appInfo = require('../appInfo.json');

var browserSync = require('browser-sync');
var httpProxy = require('http-proxy');

var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

/* This configuration allow you to configure browser sync to proxy your backend */
var proxyTarget = 'http://server/context/'; // The location of your backend
var proxyApiPrefix = 'api'; // The element in the URL which differentiate between API request and static file request

var proxy = httpProxy.createProxyServer({
  target: proxyTarget
});

function proxyMiddleware(req, res, next) {
  if (req.url.indexOf(proxyApiPrefix) !== -1) {
    proxy.web(req, res);
  } else {
    next();
  }
}

function browserSyncInit(baseDir, files, browser) {
  browser = browser === undefined ? 'default' : browser;

  browserSync.instance = browserSync.init(files, {
    startPath: '/',
    // server: {
    //   baseDir: baseDir,
    //   middleware: proxyMiddleware,
    //   port: appInfo.port,
    //   host: appInfo.host
    // },
    browser: browser,
    // proxy: appInfo.host + ':' + appInfo.port,
    port: appInfo.port
  });
}

gulp.task('develop', function () {
  nodemon({ script: 'goodreads.js', ext: 'html js', ignore: ['ignored.js'] })
    .on('restart', function () {
      console.log('restarted!')
    });
});

gulp.task('serve', ['develop', 'watch'], function () {
  // we don't want to use browser synce, we want to open a window to the node server with watches on all the various files
  browserSyncInit([
    'app',
    '.tmp'
  ], [
    'app/*.html',
    // '.tmp/styles/**/*.css',
    'app/scripts/**/*.js',
    'app/partials/**/*.html',
    'app/images/**/*'
  ]);
});

gulp.task('serve:dist', ['build'], function () {
  browserSyncInit('dist');
});

gulp.task('serve:e2e', function () {
  browserSyncInit(['app', '.tmp'], null, []);
});

gulp.task('serve:e2e-dist', ['watch'], function () {
  browserSyncInit('dist', null, []);
});
