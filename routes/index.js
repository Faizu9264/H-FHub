const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Banners = require('../models/bannerModal')

router.get('/', async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.session.userId)
    const banners = await Banners.find({})
    console.log('Fetching listed products...');
    const listedProducts = await Product.find({ listed: true });
    // console.log('Listed products:', listedProducts);
    const user = req.session.user;
    res.render('user/index', {page : 'Home', isLoggedIn, banners ,products: listedProducts, user });
  } catch (err) {
    console.error('Error fetching listed products:', err);
    res.render('user/index', { products: [], user: null });
  }
});

module.exports = router;
