const path = require('path');

const { validationResult } = require('express-validator');

const Product = require('../models/product');
const { deleteFile } = require('../util/file');

const ITEMS_PER_PAGE = 2;

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasErrors: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {

  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;
  const image = req.file;

  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasErrors: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not an Image',
      validationErrors: []
    });
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasErrors: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  const imageUrl = '/' + image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product.save()
    .then(() => {
      console.log('Created Product!!');
      res.redirect('/admin/products');
    })
    .catch(err => next(new Error(err)));
};

exports.deleteProduct = (req, res, next) => {
  const id = req.params.id;
  Product.findById(id)
    .then(product => {
      if (!product)
        return next(new Error(err)('product not found'));
      const arr = product.imageUrl.split('/');
      const filePath = path.join(__dirname, '..', arr[1]);
      deleteFile(filePath);
      return Product.deleteOne({ _id: id, userId: req.user._id });
    })
    .then(() => req.user.deleteFromCart(req.body.id))
    .then(() => {
      console.log('Product Deleted!!');
      res.status(200).json({message: 'success!!'});
    })
    .catch(err => {
      res.status(200).json({message: 'deleting product failed'});
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (editMode !== 'true') {
    return res.redirect('/');
  }

  Product.findById(req.params.id)
    .then(product => {
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasErrors: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => next(new Error(err)));
};

exports.postEditProduct = (req, res, next) => {
  const id = req.body.id;
  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;
  const image = req.file;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: 'true',
      hasErrors: true,
      product: {
        _id: id,
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(id)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) return -1;

      product.title = title;
      product.description = description;
      product.price = price;
      if (image) {
        const arr = product.imageUrl.split('/');
        const filePath = path.join(__dirname, '..', arr[1]);
        deleteFile(filePath);
        product.imageUrl = '/' + image.path;
      }

      return product.save();
    })
    .then(result => {
      if (result === -1) return res.redirect('/');
      console.log('Updated Product');
      res.redirect('/admin/products');
    })
    .catch(err => next(new Error(err)));
};

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1
  let totalItems;

  Product.find({ userId: req.user._id })
    .countDocuments()
    .then(num => {
      totalItems = num
      return Product.find({ userId: req.user._id })
        .skip((page - 1)* ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    // .select('title price -_id')
    // .populate('userId', 'username')
    .then(products => {
      // console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => next(new Error(err)));
};

