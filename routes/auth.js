const express = require('express');
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid e-mail.')
      .normalizeEmail(),
    body(
      'password',
      'Please enter an alphanumeric password with atleast 5 characters'
    )
      .trim()
      .isLength({ min: 5 })
      .isAlphanumeric()
  ],
  authController.postLogin
);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignUp);

router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid e-mail.')
      .custom((value, { location, path, req }) => {
        // if (value === 'test@test.com') {
        //   throw new Error('This e-mail is forbidden');
        // }

        // return true;

        return User.findOne({ email: value })
          .then(user => {
            if (user) {
              return Promise.reject('A user already exists for that email pick another one.');
            }
          });
      })
      .normalizeEmail(),
    body(
      'password',
      'Please enter an alphanumeric password with atleast 5 characters'
    )
      .trim()
      .isLength({ min: 5 })
      .isAlphanumeric(),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords don't match");
        }

        return true;
      })
  ],
  authController.postSignUp
);

router.get('/reset', authController.getReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/reset', authController.postReset);

router.post('/new-password', authController.postNewPassword);

module.exports = router;