
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const path = require('path');
// const productController = require('../controllers/productController');
// const {UserLoggedIn,userNotLogged} = require('../middilware/Auth')



// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'public/uploads');
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 1024 * 1024 * 2, 
//   },
// });

// router.post('/upload/:id', upload.array('images', 4), productController.addImages);


// router.get('/product', productController.getAllProducts);
// router.get('/add', productController.showAddProductForm);
// router.post('/add', upload.array('images', 4),productController.addProduct);
// router.get('/edit/:id', productController.editProductForm);
// router.post('/editproduct/:id',upload.array('images', 4), productController.editProduct);
// router.post('/delete/:id', productController.deleteProduct);
// router.get('/api', productController.getProductsAPI);
// router.get('/detail/:id', productController.getProductDetail);
// router.get('/listed', productController.getListedProducts);
// router.get('/unlisted', productController.getUnlistedProducts);
// router.get('/relist/:id', productController.relistProduct);





// module.exports = router;
