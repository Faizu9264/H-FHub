const bcrypt = require('bcrypt')
const User = require('../models/User');
const { generateOtp, sendOtp ,sendContactMail} = require('../services/otpService');
const  securePassword = require('../services/securePassword ')
const otpService = require('../services/otpService');
const Cart = require('../models/Cart')
const Order = require('../models/Order');
const UserAddress = require('../models/UserAddress');
const Product = require('../models/productModel')
const Coupons = require('../models/couponModel')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const Categories = require('../models/categoryModel')
var instance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret:  process.env.KEY_SECRET,
});
exports.getSignup = (req, res,next) => {
  const referral = req.query.referral
  res.render('user/signup',{referral});
};
exports.postSignup = async (req, res,next) => {
  try {
    const { username, password, email,referral } = req.body;
    let error = '';
    if (username.trim() === '') {
      error = 'Username is required';
    } else if (email.trim() === '') {
      error = 'Email is required';
    } else if (password.trim() === '') {
      error = 'Password is required';
    }
    if (error) {
      res.render('user/signup', { error });
      return;
    }
    const otp =  otpService.generateOtp();
    req.session.otp = otp;
    req.session.userData = { username, password, email,referral }; 
    otpService.sendOtp(email, otp);
    res.render('user/verify-otp', { email ,referral});
  } catch (error) {
    next(error)
  }
};
exports.getLogin = (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/'); 
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.render('user/login', { error: req.flash('error') });
};
exports.postLogin = async (req, res,next) => {
  try {
    const { username, password } = req.body;
    let error = '';
    if (!username && !password) {
      error = 'Username and password are required';
    } else if (!username) {
      error = 'Username is required';
    } else if (!password) {
      error = 'Password is required';
    } else {
      const user = await User.findOne({ username });
      if (user) {
        if (user.blocked) {
          error = 'Your account has been blocked. Please contact the administrator.';
        } else {
          if (await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            req.session.userId = user._id;
            req.session.isLoggedIn= true;
            return res.redirect(301,'/')
          } else {
            error = 'Invalid username or password';
          }
        }
      } else {
        error = 'Invalid username or password';
      }
    }
    res.render('user/login', { error });
  } catch (error) {
   next(error)
  }
};
exports.getLogout = async(req,res)=>{
 req.session.destroy();
 res.redirect('/')
}
exports.contact = async(req,res, next) => {
  try {
      const user = req.session.user
      const isLoggedIn = Boolean(req.session.userId)
      const usersCount = await User.find().count()
      const activeUsers = await User.find({isBlocked:false}).count()
      const happyCustomers = Math.floor( (activeUsers*100)/usersCount )
      const categoriesCount = await Categories.find({isListed:true}).count()
      res.render('user/contact',{page : 'About Us',isLoggedIn,user, usersCount, happyCustomers, categoriesCount})
  } catch (error) {
      next(error);
  }
}
exports.contactUs = async(req, res, next) => {
  try {
      console.log('sending mail');
      const { fullname, email, subject, message } = req.body
      console.log(req.body);
      await sendContactMail(fullname, email, subject, message)
      res.json({ status: true })
  } catch (error) {
     res.json({ status: false })
  }
}
exports.removeProduct = async (req, res,next) => {
  try {
    const userId = req.session.user._id;
    const productId = req.body.productId;
    // Find the user's cart
    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      return res.status(404).send('Cart not found.');
    }
    userCart.items = userCart.items.filter((item) => item.product.toString() !== productId);
    userCart.total = userCart.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
    await userCart.save();
    res.redirect('/shopping-cart');
  } catch (error) {
   next(error)
  }
}
exports.showCheckoutForm = async (req, res ,next) => {
  try {
    const userId = req.session.user._id;
    if(!userId){
      return res.redirect('/')
    }
    const userCart = await Cart.findOne({ user: userId}).populate('items.product');
    const cartSubTotal = userCart.subtotal; 
    const cartTotal = userCart.total; 
    const userAddress = await UserAddress.find({ user: userId });
    const coupons = await Coupons.find({isCancelled : false})
    const userData = await User.findById({_id: userId}).populate('cart.productId')
    const walletBalance = userData.wallet;
    res.render('user/checkout', {
      cart: userCart.items,
      cartSubTotal: cartSubTotal,
      cartTotal: cartTotal,
      userAddress,
      coupons,
      userId,
      walletBalance,
    });
  } catch (error) {
    next(error)
  }
};
exports.loadProfile = async (req, res,next) => {
  try {
    // Fetch user data and address data
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const userAddress = await UserAddress.find({ user: userId });
    res.render('user/userProfile', {
      userData,
      userAddress:userAddress,
      isLoggedIn: true,
      page: 'Profile',
      user:userData
    });
  } catch (error) {
  next(error)
  }
};
exports.loadEditProfile = async(req, res,next) => {
  try {
     const user = req.session.user;
      // console.log('userId : '+id);
      if(!user){
        res.redirect('/')
      }
      const userData = await User.findById({_id:user._id})
      res.render('user/editProfile',{userData,user:userData})
  } catch (error) {
   next(error)
  }
}
exports.postEditProfile = async(req, res,next) => {
  try {
      const userId = req.session.userId;
      const { username,email } = req.body
      const newUserData = await User.findByIdAndUpdate(
          { _id: userId },
          {
              $set:{
                 username , email
              }
          }
      );
      res.redirect('/profile');
  } catch (error) {
     next(error)
  }
}
exports.orderSuccess = async (req, res,next) => {
  try {
    const orderId = req.params.orderId; 
    const user = req.session.user;
    const order = await Order.findById(orderId)
    .populate('products.productId'); 
    const cartTotal = order.totalPrice;
    if (!order) {
      return res.status(404).send('Order not found.');
    }
    res.render('user/order-success', { order, cartTotal, user });
  } catch (err) {
  next(err)
  }
};
exports.loadAddAddress = async(req, res,next) => {
  try {
    const user = req.session.user;
    if(!user){
     return res.redirect('/')
    }
      const returnPage = req.query.returnPage
      res.render('user/addAddress',{isLoggedIn : true, page:'Add Address', parentPage:'Profile', returnPage})
  } catch (error) {
    next(error)
  }
}
exports.postAddAddress = async (req, res,next) => {
  try {
    const userId = req.session.userId;
    const { name, email, mobile, town, state, country, zip, address } = req.body;
    const returnPage = req.params.returnPage;
    const newAddress = {
      userName: name,
      mobile, 
      email,
      town, 
      state, 
      country,
      zip, 
      address,
    };
    const userHasAddress = await UserAddress.findOne({ user: userId });
    if (userHasAddress) {
      await UserAddress.updateOne(
        { user: userId },
        {
          $addToSet: {
            addresses: newAddress,
          },
        }
      );
    } else {
      await new UserAddress({
        user: userId,
        addresses: [newAddress],
      }).save();
    }
    switch (returnPage) {
      case 'profile':
        res.redirect('/profile');
        break;
      case 'checkout':
        res.redirect('/checkout');
        break;
    }
  } catch (error) {
   next(error)
  }
};
exports.loadEditAddress = async (req, res,next) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId;
    const userAddress = await UserAddress.findOne({ user: userId });
    if (!userAddress) {
      return res.status(404).send('User address not found.');
    }
    const address = userAddress.addresses.find(address => address._id.toString() === addressId);
    if (!address) {
      return res.status(404).send('Address not found.');
    }
    res.render('user/editAddress', { address, isLoggedIn: true, page: 'Profile' });
  } catch (error) {
    next(error)
  }
};
exports.postEditAddress = async (req, res,next) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId;
    const { name, email, mobile, town, state, country, zip, address } = req.body;
    const userAddress = await UserAddress.findOne({ user: userId });
    if (!userAddress) {
      res.redirect('/profile');
      return;
    }
    const addressToUpdate = userAddress.addresses.find(address => address._id.toString() === addressId);
    if (!addressToUpdate) {
      res.redirect('/profile');
      return;
    }
    addressToUpdate.userName = name;
    addressToUpdate.email = email;
    addressToUpdate.mobile = mobile;
    addressToUpdate.town = town;
    addressToUpdate.state = state;
    addressToUpdate.country = country;
    addressToUpdate.zip = zip;
    addressToUpdate.address = address;
    await userAddress.save();
    res.redirect('/profile');
  } catch (error) {
   next(error)
  }
};
exports.deleteAddress = async (req, res, next) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId;
    const userAddress = await UserAddress.findOneAndUpdate(
      { user: userId },
      { $pull: { addresses: { _id: addressId } } },
      { new: true } 
    );
    if (!userAddress) {
      return res.status(404).send('User address not found.');
    }
    res.redirect('/profile');
  } catch (error) {
  next(error)
  }
};
exports.loadChangePassword = async(req, res, next) => {
  try {
      const userId = req.session.userId
      const userData = await User.findById({ _id: userId });
      res.render('user/changePass',{user:userData})
  } catch (error) {
      next(error);
  }
}
exports.postChangePassword = async(req, res, next) => {
  try {
      const userId = req.session.userId;
      const { oldPassword, newPassword, confirmPassword } = req.body;
      if(newPassword !== confirmPassword){
          return res.redirect('/profile/changePassword')
      }
      const userData = await User.findById({ _id: userId });
      const passwordMatch = await bcrypt.compare(oldPassword, userData.password);
      if(passwordMatch){
          const sPassword = await securePassword(newPassword)
          await User.findByIdAndUpdate(
              { _id: userId },
              {
                  $set:{
                      password:sPassword
                  }
              }
          );
          return res.redirect('/profile');
      }else{
          return res.redirect('/profile/changePassword');
      }
  } catch (error) {
next(error) 
 }
}
exports.loadWalletHistory = async(req, res, next) => {
  try {
      const userId = req.session.userId;
      const userData = await User.findById({_id: userId})
      const walletHistory = userData.walletHistory.reverse()
      res.render('user/walletHistory',{isLoggedIn:true, userData,walletHistory,user:userData, page:'Profile'})
  } catch (error) {
      next(error)
  }
}
exports.addMoneyToWallet = async(req, res, next) => {
  try {
      const { amount } = req.body
      const  id = crypto.randomBytes(8).toString('hex')
      var options = {
          amount: amount*100,
          currency:'INR',
          receipt: "hello"+id
      }
      instance.orders.create(options, (err, order) => {
          if(err){
              res.json({status: false})
          }else{
              res.json({ status: true, payment:order })
          }
      })
  } catch (error) {
      next(error)
  }
}
exports.verifyWalletPayment = async(req, res, next) => {
  try {
      const userId = req.session.userId;
      const details = req.body
      const orderId = req.body.order._id;
      const amount = parseInt(details.order.amount)/100
      let hmac = crypto.createHmac('sha256',process.env.KEY_SECRET)
      hmac.update(details.response.razorpay_order_id +'|'+details.response.razorpay_payment_id)
      hmac = hmac.digest('hex');
      if(hmac === details.response.razorpay_signature){
          const walletHistory = {
              date: new Date(),
              amount,
              message: 'Deposited via Razorpay'
          }
          await User.findByIdAndUpdate(
              {_id: userId},
              {
                  $inc:{
                      wallet: amount
                  },
                  $push:{
                      walletHistory
                  }
              }
          );
          res.json({status: true,orderId})
      }else{
          res.json({status: false,orderId})
      }
  } catch (error) {
      next(next)
  }
}
