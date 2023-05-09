const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')('sk_test_51N4PNMSJOMZy3fcMlg00gnWOHLGetY9SlfRGbkghlFmjbLY5XmuLn1e86Y2fjAakYSrj6sy0clnUm8xnzNKOsHyp004NEpzfUf');

const Order = require('../models/order');
const Product = require('../models/product')

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalItems;
  Product.countDocuments().then(num => {
    totalItems = num;
    return Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
  })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
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

exports.getProduct = (req, res, next) => {
  Product.findById(req.params.id)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => next(new Error(err)));
};

exports.getIndex = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalItems;
  Product.countDocuments().then(num => {
    totalItems = num;
    return Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
  })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
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

exports.getCart = (req, res, next) => {
  req.user.populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items.map(item => {
        return { ...item.productId._doc, quantity: item.quantity };
      });
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => next(new Error(err)));
};

exports.postCart = (req, res, next) => {
  Product.findById(req.body.id)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(() => {
      console.log('Added to Cart');
      res.redirect('/cart');
    })
    .catch(err => next(new Error(err)));
};

exports.postDeleteFromCart = (req, res, next) => {
  req.user.deleteFromCart(req.body.id)
    .then(() => {
      console.log('Deleted from Cart');
      res.redirect('/cart');
    })
    .catch(err => next(new Error(err)));
};

exports.getCheckout = (req, res, next) => {
  let products;
  let totalPrice = 0;

  req.user.populate('cart.items.productId')
    .then(user => {
      products = user.cart.items.map(item => {
        return { ...item.productId._doc, quantity: item.quantity };
      });
      
      products.forEach(product => {
        totalPrice += product.quantity*product.price;
      })

      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return {
            quantity: p.quantity,
            price_data: {
              unit_amount: p.price*100,
              currency: 'usd',
              product_data: {
                name: p.title,
                description: p.description
              }
            },
          }
        }),
        success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
        mode: 'payment'
      });
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Your Checkout',
        products: products,
        totalSum: totalPrice,
        sessionId: session.id
      });
    })
    .catch(err => next(new Error(err)));
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user.populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items.map(item => {
        return { product: { ...item.productId._doc }, quantity: item.quantity };
      });

      const order = new Order({
        products: products,
        user: {
          email: user.email,
          userId: user
        }
      })

      return order.save();
    })
    .then(() => {
      req.user.cart = { items: [] };
      return req.user.save();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => next(new Error(err)));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => next(new Error(err)));
};


exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then(order => {
      if (!order) return next();

      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('User is unauthorized.'));
      }

      const invoiceName = 'invoice' + '-' + orderId + '.pdf';
      const invoicePath = path.join(__dirname, '..', 'data', 'invoices', invoiceName);

      const pdfDoc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', { underline: true });
      pdfDoc.text('-----------------------------------------');

      let totalPrice = 0;
      order.products.forEach(p => {
        totalPrice += p.product.price * p.quantity;
        pdfDoc.fontSize('18').text(`${p.product.title} - ${p.quantity}x $${p.product.price}`);
      })
      pdfDoc.fontSize(26).text('---------------');
      pdfDoc.fontSize(22).text(`Total Price: $${totalPrice}`);

      pdfDoc.end();

      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) return next(new Error(err));

      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);
      //   res.send(data);
      // })

      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);
      // file.pipe(res);

    })
    .catch(err => next(new Error(err)))
};