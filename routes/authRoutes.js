const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const productController = require('../controllers/productController')
const orderController = require('../controllers/orderController')
const couponCtrl = require('../controllers/couponCtrl')
const {isUserLoggedIn, isUserLoggedOut ,isUserBlocked} = require('../middilware/Auth')
const multer = require('multer');
const path = require('path');

// router.get('/fetch-data', userController.fetchProductsFromAdmin);

router.use(express.urlencoded({ extended: true }));

router.get('/signup',isUserLoggedOut, authController.getSignup);

router.post('/signup',isUserLoggedOut, authController.postSignup);

router.get('/login',isUserLoggedOut,authController.getLogin);

router.post('/login',isUserLoggedOut, authController.postLogin);

router.get('/logout',authController.getLogout)

router.get('/contact',authController.contact)
router.post('/contactForm',authController.contactUs)
// module.exports = authMiddleware;
router.use('/',isUserBlocked)


router.get('/unlisted-products', productController.unlistedProducts);

router.get('/add-to-cart/:id',isUserLoggedIn, productController.addToCart);
router.post('/add-to-cart', productController.addToCart);
router.get('/shopping-cart', productController.getShoppingCart);
router.post('/remove-from-cart', authController.removeProduct);
router.put('/update-cart',productController.updatecart);

router.get('/shop', userController.shop)
router.get('/shop/productOverview/:id',userController.loadProductOverview);

router.get('/wishlist',userController.loadWishlist)
router.get('/addToWishlist/:productId',userController.addToWishlist)
router.get('/removeWishlistItem/:productId',userController.removeWishlistItem)


router.get('/checkout', authController.showCheckoutForm);
router.post('/checkout',authController.showCheckoutForm);
router.post('/place-order',orderController.placeOrder);
router.post('/verifyPayment',orderController.verifyPayment)
router.get('/order-success/:orderId',authController.orderSuccess)

router.post('/search-product', productController.searchProduct);

router.get('/orders',orderController.order);
router.post('/cancel-product-order/:orderId/:productId', orderController.cancelProductOrder);
router.get('/viewOrderDetails/:orderId',orderController.loadViewOrderDetails)
router.get('/cancelOrder/:orderId',orderController.cancelOrder)
router.get('/cancelSinglePrdt/:orderId/:pdtId', orderController.cancelSinglePdt);

router.get('/returnOrder/:orderId',orderController.returnOrder)
router.get('/returnSinglePrdt/:orderId/:pdtId',orderController.returnSinglePdt)
router.get('/downloadInvoice/:orderId',orderController.loadInvoice)

router.get('/profile',authController.loadProfile)
router.get('/profile/edit',authController.loadEditProfile)
router.post('/profile/edit',authController.postEditProfile)
router.get('/profile/addAddress',authController.loadAddAddress)
router.post('/profile/addAddress/:returnPage',authController.postAddAddress)
router.get('/profile/editAddress/:id',authController.loadEditAddress)
router.post('/profile/editAddress/:id',authController.postEditAddress)
router.get('/profile/deleteAddress/:id',authController.deleteAddress)

router.get('/profile/changePassword',authController.loadChangePassword)
router.post('/profile/changePassword',authController.postChangePassword)

router.post('/profile/addMoneyToWallet/',authController.addMoneyToWallet)
router.get('/profile/walletHistory',authController.loadWalletHistory)
router.post('/verifyWalletPayment',authController.verifyWalletPayment)

router.post('/applyCoupon',couponCtrl.applyCoupon);
router.get('/removeCoupon',couponCtrl.removeCoupon)


router.get('/addReview/:productId',productController.loadAddReview)
router.post('/addReview/:productId',productController.postAddReview)
router.get('/editReview/:productId',productController.loadEditReview)
router.post('/editReview/:productId',productController.postEditReview)
router.get('/allReviews/:productId',productController.loadAllReviews)



module.exports = router;