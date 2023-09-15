const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Banners = require('../models/bannerModal')
router.get('/', async (req, res,next) => {
  try {
    const isLoggedIn = Boolean(req.session.userId)
    const banners = await Banners.find({})
    const listedProducts = await Product.find({ listed: true });
    const user = req.session.user;
    res.render('user/index', {page : 'Home', isLoggedIn, banners ,products: listedProducts, user });
  } catch (error) {
 next(error)
  }
});
module.exports = router;
