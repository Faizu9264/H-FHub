const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const User = require('../models/User')
const Cart = require('../models/Cart')
exports.shop = async(req,res, next) => {
  try {
    const user = req.session.user;
      const isLoggedIn = Boolean(req.session.userId);
    //  console.log("isLoggedIn",isLoggedIn);
      let page = 1;
      if(req.query.page){
          page = req.query.page
      }
      let limit = 6;
      //declaring a default min and max price
      let minPrice = 1;
      let maxPrice = Number.MAX_VALUE;
      //changing min and max prices to filter by price
      if (req.query.minPrice && !isNaN(parseFloat(req.query.minPrice))) {
        minPrice = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice && !isNaN(parseFloat(req.query.maxPrice))) {
        maxPrice = parseFloat(req.query.maxPrice);
      }
      let search = '';
      if (req.query.search) {
          search = req.query.search;
      }
  console.log(" search", search);
      //finding all categories that matches the search query
      async function getCategoryIds(search){
          const categories = await Category.find(
              {
                  name:{
                      $regex: '.*' +search+'.*',
                      $options: 'i'
                  }
              }
          );
          return categories.map(category => category._id)
      }
      //Declaring a common query object to find products
      const query = {
          listed: true,
          $or: [
              {
                  name:{
                      $regex: '.*' + search + '.*',
                      $options: 'i'
                  }
              },
              {
                  brand:{
                      $regex: '.*' + search + '.*',
                      $options: 'i'
                  }
              }
          ],
          price: {
              $gte: minPrice,
              $lte: maxPrice
          }
      }
      if(req.query.search){
          search = req.query.search;
          query.$or.push({
              'category' : {
                  $in: await getCategoryIds(search)
              }
          });
      };
      //add category to query to filter based on category
      if(req.query.category){
          query.category = req.query.category
      };
      //add category to query to filter based on brand
      if(req.query.brand){
          query.brand = req.query.brand
      };
      let sortValue = 1;
      if(req.query.sortValue){
          sortValue = req.query.sortValue;
      }
      let pdtsData;
      if(sortValue == 1){
        // console.log("hii",query);
          pdtsData = await Product.find(query).populate('category').populate('offer').sort({ createdAt: -1 }).limit(limit*1).skip( (page - 1)*limit );
          // console.log("pdtsData",pdtsData);
      }else{
        console.log("hello");
          pdtsData = await Product.find(query).populate('category').populate('offer')
        //   console.log("pdtsData",pdtsData);
          pdtsData.forEach(((pdt) => {
              if (pdt.offerPrice) {
                  pdt.actualPrice = pdt.offerPrice
                  console.log(pdt.actualPrice);
              } else {
                  pdt.actualPrice = pdt.price - pdt.discountPrice
              }
          }))
          if(sortValue == 2){
              //sorting ascending order of actualPrice
              pdtsData.sort( (a,b) => {
                  return a.actualPrice - b.actualPrice;
              });
    //   console.log("pdtsData",pdtsData);
          }else if(sortValue == 3){
              //sorting descending order of actualPrice
              pdtsData.sort( (a,b) => {
                  return b.actualPrice - a.actualPrice;
              });
          }
          pdtsData = pdtsData.slice((page - 1) * limit, page * limit);
    //   console.log("pdtsData",pdtsData);
      }
      const categoryNames = await Category.find({})
      const brands = await Product.aggregate([{
              $group: {
                  _id: '$brand'
              }
      }]);
      let totalProductsCount = await Product.find(query).count()
      let pageCount = Math.ceil(totalProductsCount / limit)
      let removeFilter = 'false'
      if(req.query && !req.query.page){
          removeFilter = 'true'
      };
      let userData;
      let wishlist;
      let cart;
      if(req.session.userId){
        userData = await User.findById({_id:req.session.userId})
        wishlist = userData.wishlist;
        cart = await Cart.findOne({ user: user._id }).populate('items.product');
        // cart = userData.cart.map(item => item.productId.toString())
    }
      res.render('user/shop',{
          user,
          pdtsData,
          userId: req.session.userId,
          categoryNames,
          brands,
          pageCount,
          currentPage: page,
          sortValue,
          minPrice: req.query.minPrice,
          maxPrice: req.query.maxPrice,
          category: req.query.category,
          brand: req.query.brand,
          removeFilter,
          search: req.query.search,
          wishlist,
          cart,
          isLoggedIn,
          page:'Shop'
      });
  } catch (error) {
              next(error);
  }
};
async function fetchTrendingProducts(query, page, limit) {
  const products = await Product.find(query).populate('offer')
    .sort({ salesCount: -1 }) 
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('category');
  return products;
}
async function fetchProductsByPriceRange(query, minPrice, maxPrice, page, limit) {
  query.price = { $gte: minPrice, $lte: maxPrice };
  const products = await Product.find(query).populate('offer')
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('category');
  return products;
}
exports.loadProductOverview = async(req,res, next) => {
  try {
      const id = req.params.id;
      console.log(" id", id);
      const userId = req.session.userId
      console.log("user",userId);
      const isLoggedIn = Boolean(userId)
      const pdtData = await Product.findById({_id:id}).populate('reviews.userId')
      let isPdtExistInCart = false;
      let isPdtAWish = false;
      let isUserReviewed = false;
      if(userId){
          const userData = await User.findById({_id:userId})
          var user = userData;
          const wishlist = userData.wishlist;
          if(wishlist.find((productId) => productId == id ) > -1){
              isPdtAWish = true;
          }
         let cart = await Cart.findOne({ user: userId }).populate('items.product');
         if (cart) {
          cart.items.forEach((pdt) => {
            if (pdt.product == id) {
              isPdtExistInCart = true;
            }
          });
        }
          pdtData.reviews.forEach((review) => {
              if(review.userId == userId){
                  isUserReviewed = true;
              }
          });
      }else{
        var user = null
      }
      let currPrice = 0;
      if(pdtData.offer){
          currPrice = pdtData.offerPrice
      }else{
          currPrice = pdtData.price - pdtData.discountPrice
      }
      const discountPercentage = Math.floor( 100 - ( (currPrice*100) / pdtData.price ) )
      console.log(user);
      res.render('product/detail',{pdtData, parentPage : 'Shop', page: 'detail',isLoggedIn, isPdtAWish, isPdtExistInCart, isUserReviewed,user:userId,currPrice, discountPercentage,user})
  } catch (error) {
              next(error);
  }
}
exports.loadWishlist = async(req, res, next) => {
  try {
      const userId = req.session.userId
      const isLoggedIn = Boolean(req.session.userId)
      const userData = await User.findById({_id:userId}).populate('wishlist')
      let user = userData
      const wishlist = userData.wishlist
      res.render('user/wishlist',{page:'Wishlist', parentPage:'Shop', isLoggedIn, wishlist,user})
  } catch (error) {
      next(error)
  }
}
exports.addToWishlist = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { userId } = req.session
      const userData = await User.findById({_id: userId});
      if(!userData.wishlist.includes(productId)){
          userData.wishlist.push(productId)
          await userData.save()
          req.session.wishCount++
      }
      let { returnPage } = req.query
      if(returnPage == 'shop'){
          res.redirect('/shop')
      }else if(returnPage == 'detail'){
          res.redirect(`/shop/productOverview/${productId}`)
      }
  } catch (error) {
      next(error)
  }
}
exports.removeWishlistItem = async(req, res, next) => {
  try {
      const { productId } = req.params
      const { userId } = req.session
      await User.findByIdAndUpdate(
          {_id: userId},
          {
              $pull:{
                  wishlist: productId
              }
          }
      );
      req.session.wishCount--
      const { returnPage } = req.query
      if(returnPage == 'shop'){
          res.redirect('/shop')
      }else if(returnPage == 'productOverview'){
          res.redirect(`/shop/productOverview/${productId}`)
      }else if(returnPage == 'wishlist'){
          res.redirect('/wishlist')
      }
  } catch (error) {
      next(error)
  }
}
