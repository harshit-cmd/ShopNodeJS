const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controllers/admin');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', adminController.getAddProduct);
// /admin/add-product => POST
router.post(
  '/add-product',
  [
    body('title')
      .trim()
      .isString()
      .isLength({ min: 3 })
      .withMessage('The title must be atleast 3 characters long.'),
    // body('imageUrl')
    //   .isURL()
    //   .withMessage('The imageUrl must be a URL.'),
    body('price')
      .isFloat()
      .withMessage('The price must be a floating point integer.'),
    body('description')
      .trim()
      .isLength({ min: 5, max: 400 })
      .withMessage('The description must be between 5-400 characters in length.')
  ],
  adminController.postAddProduct
);

router.get('/products', adminController.getProducts);

router.get('/edit-product/:id', adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title')
      .trim()
      .isString()
      .isLength({ min: 3 })
      .withMessage('The title must be atleast 3 characters long.'),
    // body('imageUrl')
    //   .isURL()
    //   .withMessage('The imageUrl must be a URL.'),
    body('price')
      .isFloat()
      .withMessage('The price must be a floating point integer.'),
    body('description')
      .trim()
      .isLength({ min: 5, max: 400 })
      .withMessage('The description must be between 5-400 characters in length.')
  ],
  adminController.postEditProduct
);

router.delete('/product/:id', adminController.deleteProduct);

module.exports = router;
