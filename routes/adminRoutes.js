const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const couponCtrl = require('../controllers/couponCtrl')
const offerCtrl = require('../controllers/offerCtrl')
const productController = require('../controllers/productController')
const brandOfferCtrl = require('../controllers/brandOfferCtrl')
const orderController = require('../controllers/orderController')
const bannerCtrl = require('../controllers/bannerCtrl')
const multer = require('multer');
const path = require('path');
const { isAdminLoggedIn, isAdminLoggedOut } = require('../middilware/Auth')

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

// router.get('/', adminController.getLogin);
// router.post('/', adminController.postLogin); 
router.get('/signup', adminController.getSignup);
router.post('/signup', adminController.postSignup);
router.get('/login',isAdminLoggedOut,adminController.getLogin);
router.post('/login',isAdminLoggedOut, adminController.postLogin);

router.get('/logout', adminController.getLogout);
router.post('/logout', adminController.postLogout);


router.use('/',isAdminLoggedIn)
router.get('/dashboard', adminController.getDashboard);

router.get('/admin/dashboard', adminController.getUserData); 
router.post('/search-users', adminController.searchUsers);

router.get('/usersProfile', adminController.usersProfile);





router.post('/block-unblock-user', adminController.blockUnblockUser);


router.get('/categories', categoryController.getAllCategories);
router.post('/categories',categoryController.addCategory);
router.post('/categories/edit',upload.single('categoryImage'),categoryController.editCategory)
router.get('/categories/list/:id',categoryController.listCategory)






router.get('/UsersOrders', orderController.ordersList);
router.get('/orders/:id', orderController.orderDetails);
router.post('/orders/:id/update-status', orderController.updateOrderStatus);
router.get('/approveReturn/:orderId',orderController.approveReturn)
router.get('/cancelOrder/:orderId',orderController.cancelOrder)
router.get('/cancelSinglePrdt/:orderId/:pdtId',orderController.cancelSinglePdt)
// adminController.js
router.get('/approveReturnSinglePrdt/:orderId/:pdtId',orderController.approveReturnForSinglePdt)


 router.get('/AdminviewOrderDetails/:orderId', adminController.viewAdminOrderDetails);
router.get('/AdmincancelProduct/:orderId/:productId', adminController.AdmincancelProduct);

  

router.post('/changeOrderStatus',adminController.changeOrderStatus)
router.get('/cancelOrder/:orderId',adminController.cancelOrder)

router.get('/coupons',couponCtrl.loadCoupons)
router.get('/coupons/addCoupon',couponCtrl.loadAddCoupon)
router.post('/coupons/addCoupon',couponCtrl.postAddCoupon)

router.get('/coupons/editCoupon/:couponId',couponCtrl.loadEditCoupon)
router.post('/coupons/editCoupon/:couponId',couponCtrl.postEditCoupon)
router.get('/coupons/cancelCoupon/:couponId',couponCtrl.cancelCoupon)

router.get('/offers',offerCtrl.loadOffer)
router.get('/offers/addOffer',offerCtrl.loadAddOffer)
router.get('/offers/editOffer/:offerId',offerCtrl.loadEditOffer)

router.post('/offers/addOffer',offerCtrl.postAddOffer)
router.post('/offers/editOffer/:offerId',offerCtrl.postEditOffer)
router.get('/offers/cancelOffer/:offerId',offerCtrl.cancelOffer)
router.post('/applyOfferToCategory',categoryController.applyCategoryOffer)
router.post('/removeCategoryOffer/:catId',categoryController.removeCategoryOffer)
router.post('/applyOfferToProduct',productController.applyProductOffer)
router.post('/removeProductOffer/:productId',productController.removeProductOffer)


router.get('/brandOffers',brandOfferCtrl.loadBrandOffersList)
router.get('/brandOffers/addBrandOffer',brandOfferCtrl.loadAddBrandOffer)
router.post('/brandOffers/addBrandOffer',brandOfferCtrl.postAddBrandOffer)
router.get('/brandOffers/editBrandOffer/:brandOfferId',brandOfferCtrl.loadEditBrandOffer)
router.post('/brandOffers/editBrandOffer/:brandOfferId',brandOfferCtrl.postEditBrandOffer)
router.get('/brandOffers/cancelBrandOffer/:brandOfferId',brandOfferCtrl.cancelBrandOffer)


router.get('/banners',bannerCtrl.loadBannerList) 
router.post('/addBanner',upload.single('bannerImage'),bannerCtrl.addBanner)
router.post('/updateBanner/:bannerId',upload.single('bannerImage'),bannerCtrl.UpdateBanner)
router.post('/deleteBanner/:bannerId',bannerCtrl.deleteBanner)



router.post('/upload/:id', upload.array('images', 4), productController.addImages);
router.get('/products', productController.getAllProducts);
router.get('/products/add', productController.showAddProductForm);
router.post('/products/add', upload.array('images', 4),productController.addProduct);
router.get('/products/edit/:id', productController.editProductForm);
router.post('/products/editproduct/:id',upload.array('images', 4), productController.editProduct);
router.post('/products/delete/:id', productController.deleteProduct);
router.get('/api', productController.getProductsAPI);
router.get('/detail/:id', productController.getProductDetail);
router.get('/listed', productController.getListedProducts);
router.get('/products/unlisted', productController.getUnlistedProducts);
router.get('/products/relist/:id', productController.relistProduct);

module.exports = router;
