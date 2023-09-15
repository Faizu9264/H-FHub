const multer = require('multer');
const path = require('path');
const Product = require('../models/productModel');
const Cart = require ('../models/Cart')
const User = require('../models/User'); 
const Category = require('../models/categoryModel');
const Offers = require('../models/offerModel')
const Orders = require('../models/Order')
const { result } = require('lodash');
const { response } = require('express');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 2, 
  },
});
exports.showAddProductForm = async(req, res,next) => {
  try {
    const categories = await Category.find(); 
    const currentPage = 'Products';
    res.render('product/add', { categories,currentPage }); 
  } catch (error) {
    next(error);
  }
};
exports.addProduct = async (req, res,next) => {
  const {brand, productName, price, dprice, description, category, stock } = req.body;
  const images = req.files.map((file) => file.filename);
  try {
    const categoryObj = await Category.findOne({ name: category });
    if (!categoryObj) {
      return res.status(400).send('Category not found.');
    }
    const product = await Product.create({
      name: productName,
      price: price,
      discountPrice: dprice,
      description: description,
      images: images,
      category: categoryObj._id,
      stock: stock, 
      brand:brand,
    });
    res.redirect('/admin/products');
  } catch (error) {
   next(error)
  }
};
exports.getAllProducts = async (req, res,next) => {
  const showUnlisted = req.query.showUnlisted === 'true';
  try {
    const currentPage = 'products';
    if (showUnlisted) {
      pdtsData = await Product.find().populate('category').populate('offer');
    } else {
      pdtsData = await Product.find({ listed: true }).populate('category').populate('offer');
       // console.log(pdtsData);
       const offerData = await Offers.find({ $or: [
        {status : 'Starting Soon'},
        {status : 'Available' }
    ]});
      return res.render('product/index', { pdtsData, offerData, page:'index',currentPage});
    }
    res.render('product/index', { pdtsData, offerData, page:'index',currentPage});
  } catch (error) {
  next(error)
  }
};
exports.editProductForm = async (req, res,next) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId);
    const categories = await Category.find();
    const currentPage = 'products';
    if (!product) {
      return res.render('error', { message: 'Product not found',currentPage });
    }
    res.render('product/edit', { product,categories ,currentPage});
  } catch (error) {
    next(error)
  }
};
exports.editProduct = async (req, res,next) => {
  const productId = req.params.id;
  const { brand, name, price, description, discountPrice, stock } = req.body; 
  const newImages = req.files ? req.files.map((file) => file.filename) : [];
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.render('error', { message: 'Product not found' });
    }
    // Make sure the required fields are provided in the request body
    try{
      if (!brand || !name || !price || !description || !discountPrice) {
        // return res.render('errors/404', { message: 'Required fields missing' });
      }
    }catch(error){
      next(error)
    }
    product.brand = brand; // Update the brand field
    product.name = name;
    product.price = price;
    product.description = description;
    product.discountPrice = discountPrice;
    product.stock = stock; // Update the stock value
    // ... Update other fields as needed
    product.images = newImages;
    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
   next(error)
  }
};
exports.uploadImages = upload.array('images', 4);
exports.addImages = async (req, res) => {
  const productId = req.params.id;
  const images = req.files.map((file) => file.filename);
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.render('error', { message: 'Product not found' });
    }
    product.images = images;
    await product.save();
    res.redirect(`/products/edit/${productId}`);
  } catch (error) {
   next(error)
  }
};
exports.getListedProducts = async (req, res,next) => {
  try {
    const products = await Product.find({ deleted: false });
    res.render('product/listed', { products });
  } catch (error) {
 next(error)
  }
};
exports.getUnlistedProducts = async (req, res,next) => {
  try {
    const products = await Product.find({ listed: false });
    res.render('product/unlisted', { products });
  } catch (error) {
  next(error)
  }
};
exports.deleteProduct = async (req, res,next) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.render('error', { message: 'Product not found' });
    }
    product.listed = false; 
    await product.save();
    res.redirect('/admin/products/unlisted'); 
  } catch (error) {
   next(error)
  }
};
exports.getProductsAPI = async (req, res,next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
next(error)
  }
};
exports.getProductDetail = async (req, res,next) => {
  const productId = req.params.id;
  try {
    const user = req.session.user;
    const product = await Product.findById(productId);
    if (!product) {
      return res.render('product/detail', { product: null });
    }
    res.render('product/detail', { product,user });
  } catch (error) {
   next(error)
  }
};
exports.relistProduct = async (req, res,next) => {
  const productId = req.params.id;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.render('error', { message: 'Product not found' });
    }
    product.listed = true; 
    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
    next(error)
  }
};
exports.unlistedProducts = async (req, res,next) => {
  try {
    const unlistedProducts = await Product.find({ listed: false });
    res.render('user/unlisted-products', { unlistedProducts });
  } catch (err) {
 next(error)
  }
};
exports.addToCart = async (req, res,next) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user;
    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      userCart = new Cart({
        user: userId,
        items: [],
        total: 0,
      });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found.');
    }
    const discount = typeof product.discountPrice === 'number' ? product.discountPrice : 0;
    const actualPrice = product.price - discount;
    const productIndex = userCart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (productIndex === -1) {
      userCart.items.push({
        product: productId,
        quantity: 1,
        price: actualPrice,
      });
    } else {
      userCart.items[productIndex].quantity += 1;
    }
    userCart.total = userCart.items.reduce((total, item) => {
      return total + actualPrice * item.quantity;
    }, 0);
    await userCart.save();
    res.redirect('/shopping-cart');
  } catch (error) {
   next(error)
  }
};
exports.getShoppingCart = async (req, res,next) => {
  try {
    const userId = req.session.user;
    const user = userId;
    if (!userId) {
      return res.redirect('/login');
    }
    const cartItems = await Cart.findOne({ user: userId._id }).populate('items.product').populate('items.product.offer');
    if (!cartItems) {
      const newCart = new Cart({ user: userId._id, items: [], total: 0 });
      await newCart.save();
      return res.redirect('/shopping-cart');
    }
    const cartSubtotal = calculateCartSubtotal(cartItems.items);
    // Calculate the total discount by summing up discounts for each item
    const carttotalDiscount = cartItems.items.reduce((totalDiscount, item) => {
      const discount = item.product.offer ? item.product.offer.offerPrice : 0;
      return totalDiscount + (discount * item.quantity);
    }, 0);
    const cartTotal = cartItems.total;
    res.render('user/shopping-cart', { cartItems,user, cartSubtotal, carttotalDiscount, cartTotal, userId });
  } catch (error) {
  next(error)
  }
};
function calculateCartSubtotal(cartItems) {
  let subtotal = 0;
  cartItems.forEach(item => {
    if (item.product && item.product.price) {
      subtotal += item.product.price * item.quantity;
    }
  });
  return subtotal;
}
exports.updatecart = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const quantity = parseInt(req.body.amt);
    const prodId = req.body.prodId;
    const pdtData = await Product.findById({ _id: prodId });
    const stock = pdtData.stock;
    let totalSingle;
    if (pdtData.offerPrice) {
      totalSingle = quantity * pdtData.offerPrice;
    } else {
      totalSingle = quantity * (pdtData.price - pdtData.discountPrice);
    }
    if (stock >= quantity) {
      const cartItem = await Cart.findOneAndUpdate(
        { user: userId, 'items.product': prodId },
        { $set: { 'items.$.quantity': quantity } },
        { new: true }
      );
      if (cartItem) {
        const totalPrice = cartItem.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
        const cartItems = await Cart.findOne({ user: userId })
          .populate('items.product')
          .populate('items.product.offer');
        if (cartItems) {
          let totalDiscount = 0;
          cartItems.items.forEach(item => {
            const product = item.product;
            const itemTotalDiscount = product.offerPrice
              ? (product.price - product.offerPrice) * item.quantity
              : product.discountPrice * item.quantity;
            totalDiscount += itemTotalDiscount;
          });
          res.json({
            status: true,
            data: { totalSingle, totalPrice, totalDiscount }
          });
        } else {
          res.json({
            status: false,
            data: 'Cart items not found'
          });
        }
      } else {
        res.json({
          status: false,
          data: 'Product not found in cart'
        });
      }
    } else {
      res.json({
        status: false,
        data: 'Sorry, the product stock has been exceeded'
      });
    }
  } catch (error) {
    next(error);
  }  
};
exports.searchProduct = async (req, res,next) => {
  const searchTerm = req.query.searchTerm;
console.log(searchTerm);
  if (!searchTerm) {
      // return res.status(400).json({ error: 'Search term is empty.' });
      return  res.redirect('/shop')
  }
  try {
      const products = await Product.find({ name: { $regex: new RegExp('^' + searchTerm, 'i') } }).limit(10);
      res.status(200).json({ products });
  } catch (error) {
    next(error)
  }
};
exports.applyProductOffer = async(req, res, next) => {
  try {
      const { offerId, productId } = req.body
      // console.log('offerid '+offerId+'  \nproductId : '+productId);
      const product = await Product.findById({_id:productId})
      const offerData = await Offers.findById({_id:offerId})
      const actualPrice = product.price - product.discountPrice;
      let offerPrice = 0;
      if(offerData.status == 'Available'){
          offerPrice = Math.round( actualPrice - ( (actualPrice*offerData.discount)/100 ))
      }
      // const offerPrice = Math.round( actualPrice - ( (actualPrice*offerData.discount)/100 ))
      await Product.findByIdAndUpdate(
          {_id:productId},
          {
              $set:{
                  offerPrice,
                  offerType: 'Offers',
                  offer: offerId,
                  offerAppliedBy: 'Product'
              }
          }
      )
      res.redirect('/admin/products')
  } catch (error) {
      next(error)
  }
}
exports.removeProductOffer = async(req, res, next) => {
  try {
      const { productId } = req.params
      await Product.findByIdAndUpdate(
          {_id: productId},
          {
              $unset:{
                  offer:'',
                  offerType: '',
                  offerPrice:'',
                  offerAppliedBy:''
              }
          }
      );
      res.redirect('/admin/products')
  } catch (error) {
      next(error)
  }
}
exports.loadAddReview = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { userId } = req.session
      let isPdtPurchased = false
      const isLoggedIn = Boolean(req.session.userId)
      const orderData = await Orders.findOne({ userId, 'products.productId': productId })
      if(orderData) isPdtPurchased = true
      if(userId){
        const user = await User.findById({_id: userId})
      res.render('user/addReview',{page:'Reviews', parentPage:'Shop',isPdtPurchased, productId, userId, isLoggedIn,user})
      }else{
        const user = null
        res.render('user/addReview',{page:'Reviews', parentPage:'Shop',isPdtPurchased, productId, userId, isLoggedIn,user})
      }
  } catch (error) {
      next(error)
  }
}
exports.postAddReview = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { userId } = req.session
      const { rating, title, description } = req.body
      await Product.updateOne(
          {_id:productId},
          {
              $push:{
                  reviews:{
                      userId, title, rating, description, createdAt: new Date()
                  }
              }
          }
      );
      const pdtData = await Product.findById({_id:productId})
      const totalRating = pdtData.reviews.reduce((sum, review) => sum += review.rating, 0)
      const avgRating = Math.floor(totalRating/pdtData.reviews.length)
      await Product.updateOne(
          {_id:productId},
          {
              $set:{
                  totalRating: avgRating
              }
          }
      );
      res.redirect(`/shop/productOverview/${productId}`)
  } catch (error) {
      next(error)
  }
}
exports.loadEditReview = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { userId } = req.session;
      const isLoggedIn = Boolean(userId)
      const pdtData = await Product.findOne(
          {
              _id:productId,
              reviews:{
                  $elemMatch: { userId }
              }
          }
      ).populate('reviews.userId');
      const user = await User.findById({_id: userId})
      const reviewData = pdtData.reviews.find((review) => review.userId._id == userId)
      res.render('user/editReview',{ reviewData, productId, isLoggedIn, page:'Edit Review', parentPage: 'Shop' ,user })
  } catch (error) {
      next(error)
  }
}
exports.postEditReview = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { reviewId }  = req.query
      const { rating, title, description } = req.body
      await Product.updateOne(
          {_id:productId, 'reviews._id': reviewId },
          {
              $set:{
                  'reviews.$.rating' : rating,
                  'reviews.$.title' : title,
                  'reviews.$.description' : description
              }
          }
      );
      const pdtData = await Product.findById({_id:productId})
      const totalRating = pdtData.reviews.reduce((sum, review) => sum += review.rating, 0)
      const avgRating = Math.floor(totalRating/pdtData.reviews.length)
      await Product.updateOne(
          {_id:productId},
          {
              $set:{
                  totalRating: avgRating
              }
          }
      );
      res.redirect(`/shop/productOverview/${productId}`)
  } catch (error) {
      next(error)
  }
}
exports.loadAllReviews = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { userId } = req.session
      const isLoggedIn = Boolean(userId)
      const pdtData = await Product.findById({_id: productId})
      const user = await User.findById({_id: userId})
      res.render('user/showReviews',{pdtData, userId, page:'Reviews', parentPage:'Shop', isLoggedIn,user})
  } catch (error) {
      next(error)
  }
}