const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const User = require("../models/user");

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: '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'
  }
}));

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login Page',
    errorMessage: req.flash('error')[0],
    oldInput: {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login Page',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login Page',
          errorMessage: 'No user found with the given e-mail',
          oldInput: {
            email: email,
            password: password
          },
          validationErrors: [{ path: 'email' }]
        });
      }
      else return bcrypt.compare(password, user.password);
    })
    .then(result => {
      if (result === true) {
        req.session.loggedIn = email;
        req.session.save(err => {
          if (err) console.log(err);
          res.redirect('/');
        });
      } else if (result === false) {
        res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login Page',
          errorMessage: 'Incorrect Password',
          oldInput: {
            email: email,
            password: password
          },
          validationErrors: [{ path: 'password' }]
        });
      }
    })
    .catch(err => next(new Error(err)));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(new Error(err));
    res.redirect('/');
  });
};

exports.getSignUp = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Sign Up Page',
    errorMessage: req.flash('error')[0],
    oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  });
};

exports.postSignUp = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('auth/signup', {
      path: '/singup',
      pageTitle: 'Sign Up Page',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword
      },
      validationErrors: errors.array()
    });
  }

  bcrypt.hash(password, 12)
    .then(result => {
      const newUser = new User({
        email: email,
        password: result,
        cart: { items: [] }
      });

      return newUser.save()
    })
    .then(() => {
      res.redirect('/login');
      transporter.sendMail({
        to: email,
        from: 'harshit.s.rawat@gmail.com',
        subject: 'Signup succeeded!!',
        html: '<h1>You successfully signed up!!!</h1>'
      })
        .then(() => console.log(`email sent successfully to ${email}`))
        .catch(err => next(new Error(err)));
    })
    .catch(err => next(new Error(err)));
};

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: req.flash('error')[0]
  });
};

exports.postReset = (req, res, next) => {
  const email = req.body.email;

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }

    const token = buffer.toString('hex');
    User.findOne({ email: email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No User Found with the corresponding Email.');
          return -1;
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(result => {
        if (result === -1) res.redirect('/reset');
        else {
          res.redirect('/login');
          transporter.sendMail({
            to: email,
            from: 'harshit.s.rawat@gmail.com',
            subject: 'Password reset',
            html: `
              <p>You requested a password reset.</p>
              <p>Click this <a href='http://localhost:3000/reset/${token}'>link</a> to set a new password</p>
              <p>Note: The link given about expires in an hour</p>
            `
          })
            .then(() => console.log(`password reset email sent successfully to ${email}`))
            .catch(err => next(new Error(err)));
        }
      })
      .catch(err => next(new Error(err)));
  })
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      if (!user) return next();
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: req.flash('error')[0],
        userId: user._id,
        passwordToken: token
      });
    })
    .catch(err => next(new Error(err)));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let fetchedUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
    .then(user => {
      fetchedUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      fetchedUser.password = hashedPassword;
      fetchedUser.resetToken = undefined;
      fetchedUser.resetTokenExpiration = undefined;
      return fetchedUser.save();
    })
    .then(() => {
      res.redirect('/login');
    })
    .catch(err => next(new Error(err)));
};

