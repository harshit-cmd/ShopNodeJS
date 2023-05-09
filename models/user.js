const { Schema, default: mongoose } = require('mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true
        }
      }
    ]
  }
});

// IMP!!! while adding methods we should use arrow functions so that this doesn't point to the global object but to a instance of the model
userSchema.methods.addToCart = function (product) {
  const i = this.cart.items.findIndex(item => item.productId.toString() == product._id.toString());
  if (i === -1) {
    this.cart.items.push({
      productId: product._id,
      quantity: 1
    });
  } else {
    this.cart.items[i].quantity += 1;
  }

  return this.save();
};

userSchema.methods.deleteFromCart = function (id) {
  this.cart = this.cart.items.filter(item => item.productId.toString() != id);
  return this.save();
};

module.exports = mongoose.model('User', userSchema);