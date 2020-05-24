var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var globs = require('./handlers/global');
var autorun = require('./handlers/autoSwitchingHandlerV2');

//generate a new token and set an interval for 8 minutes
globs.generateToken();
setInterval(globs.generateToken, 8 * 60 * 1000);
setInterval(autorun.init, 240 * 60 * 1000); //every 4 hours
globs.startMySQL();
var indexRouter = require('./routes/index');
var initRouter = require('./routes/initialise');
var postcodeRouter = require('./routes/postcode');
var supplierRouter = require('./routes/suppliers');
var usageRouter = require('./routes/usage');
var switchRouter = require('./routes/switch');
var miscRouter = require('./routes/misc');
var tariffRouter = require('./routes/tariff');


var refRouter = require('./routes/ref');

var app = express();



app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
//app.use(cors({origin: '*'}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/init', initRouter);
app.use('/postcode', postcodeRouter);
app.use('/suppliers', supplierRouter);
app.use('/usage', usageRouter);
app.use('/switch', switchRouter);
app.use('/functions', miscRouter);
app.use('/tariff', tariffRouter);
app.use('/ref', refRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
