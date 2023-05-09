const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const { default: mongoose } = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth')
const User = require('./models/user');
const isAuth = require('./middleware/is-auth');

const MONGODB_URI = 'mongodb+srv://new-user_31:vcUdijvEYz38Dccv@mycluster.vqp8ya1.mongodb.net/shop?retryWrites=true&w=majority';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'images'),
  filename: (req, file, cb) => cb(null, Date.now().toString() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg')
    cb(null, true);
  else
    cb(null, false);
}

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({
  secret: 'My Secret',
  resave: false,
  saveUninitialized: false,
  store: store
}));
app.use(csrf());
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.loggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  const loggedInUser = req.session.loggedIn;
  if (!loggedInUser) return next();

  User.findOne({ email: loggedInUser })
    .then(user => {
      if (!user) return next();

      req.user = user;
      next();
    })
    .catch(err => next(new Error(err)));
});

app.use('/admin', isAuth, adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use((req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: '404'
  });
});

app.use((error, req, res, next) => {
  console.log(error);
  res.status(500).render('500', {
    pageTitle: '',
    path: '500'
  })
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connection Established');
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
    throw err;
  })