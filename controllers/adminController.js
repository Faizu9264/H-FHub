const bcrypt = require('bcrypt');
const Admin = require('../models/admin');
const User = require('../models/User');
const Orders = require('../models/Order')
const { getMonthName } = require('../helpers/helpersFunctions')
const { findIncome, countSales, findSalesData, findSalesDataOfYear, findSalesDataOfMonth, formatNum } = require('../helpers/orderHelper')
const dotenv = require('dotenv')
dotenv.config();
const  UserAddress = require('../models/UserAddress')
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE;
exports.getLogin = (req, res) => {
  const message = req.session.message ? req.session.message : '';
  req.session.message = undefined;
  res.render('admin/admin-login', { message });
};
exports.postLogin = async (req, res,next) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username: username });
    if (admin) {
      const result = await bcrypt.compare(password, admin.password);
      if (result) {
        req.session.admin = admin;
        res.redirect('/admin/dashboard');
      } else {
        req.session.message = 'Invalid password';
        res.redirect('/admin/login');
      }
    } else {
      req.session.message = 'Admin not found';
      res.redirect('/admin/login');
    }
  } catch (err) {
   next(err);
  }
};
exports.getSignup = (req, res) => {
  res.render('admin/admin-signup', { message: req.session.message });
};
exports.postSignup = async (req, res,next) => {
  const { username, password, secretCode } = req.body;
  try {
    if (secretCode === ADMIN_SECRET_CODE) {
      req.session.message = 'Invalid secret code';
      res.redirect('/admin/login');
      return;
    }
    const existingAdmin = await Admin.findOne({ username }); 
    if (existingAdmin) {
      req.session.message = 'Username already exists';
      res.redirect('/admin/signup');
      return;
    }
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    req.session.message = 'Admin created successfully';
    res.redirect('/admin/login');
  } catch (error) {
    next(error);
  }
};
exports.getDashboard = async(req,res, next) => {
  try {
      //Setting Dates Variables
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const jan1OfTheYear =  new Date(today.getFullYear(), 0, 1);
      const totalIncome = await findIncome()
      const thisMonthIncome = await findIncome(firstDayOfMonth)
      const thisYearIncome = await findIncome(jan1OfTheYear)
      const totalUsersCount = formatNum(await User.find({}).count()) 
      const usersOntheMonth = formatNum(await User.find({ createdAt:{ $gte: firstDayOfMonth }}).count()) 
      const totalSalesCount = formatNum(await countSales()) 
      const salesOnTheYear = formatNum(await countSales(jan1OfTheYear)) 
      const salesOnTheMonth = formatNum(await countSales(firstDayOfMonth)) 
      const salesOnPrevMonth = formatNum(await countSales( firstDayOfPreviousMonth, firstDayOfPreviousMonth ))
      let salesYear = 2023;
      if(req.query.salesYear){
          salesYear = parseInt(req.query.salesYear)
      }
      if(req.query.year){
          salesYear = parseInt(req.query.year)
          displayValue = req.query.year
          xDisplayValue = 'Months'
      }
      let monthName = ''
      if(req.query.month){
          salesMonth = 'Weeks',
          monthName = getMonthName(req.query.month)
          displayValue = `${salesYear} - ${monthName}`
      }
      const totalYears = await Orders.aggregate([
          { $group: { _id: { createdAt:{ $dateToString: {format: '%Y', date: '$createdAt'}}}}},
          { $sort: {'_id:createdAt': -1 }}
      ]);
      const displayYears = [];  //use map if possible
      totalYears.forEach((year) => {
          displayYears.push(year._id.createdAt)
      });
      let orderData;
      if(req.query.year && req.query.month){
          orderData = await findSalesDataOfMonth( salesYear, req.query.month )
      }else if(req.query.year && !req.query.month){
          orderData = await findSalesDataOfYear(salesYear)
      }else{
          orderData = await findSalesData()
      }
      let months = []
      let sales = []
      if(req.query.year && req.query.month){
          orderData.forEach((year) => { months.push(`Week ${year._id.createdAt}`) })
          orderData.forEach((sale) => { sales.push(Math.round(sale.sales)) })
      }else if(req.query.year && !req.query.month){
          orderData.forEach((month) => {months.push(getMonthName(month._id.createdAt))})
          orderData.forEach((sale) => { sales.push(Math.round(sale.sales))})
      }else{
          orderData.forEach((year) => { months.push(year._id.createdAt) })
          orderData.forEach((sale) => { sales.push(Math.round(sale.sales)) })
      }
      let totalSales = sales.reduce((acc,curr) => acc += curr , 0)
      // category sales
      let categories = []
      let categorySales = []
      const categoryData = await Orders.aggregate([
                  { $match: { status: 'Delivered' } },
                  {
                      $unwind: '$products'
                  },
                  {
                      $lookup: {
                          from: 'products', // Replace 'products' with the actual name of your products collection
                          localField: 'products.productId',
                          foreignField: '_id',
                          as: 'populatedProduct'
                      }
                  },
                  {
                      $unwind: '$populatedProduct'
                  },
                  {
                      $lookup: {
                          from: 'categories', // Replace 'categories' with the actual name of your categories collection
                          localField: 'populatedProduct.category',
                          foreignField: '_id',
                          as: 'populatedCategory'
                      }
                  },
                  {
                      $unwind: '$populatedCategory'
                  },
                  {
                      $group: {
                          _id: '$populatedCategory.name', sales: { $sum: '$totalPrice' } // Assuming 'name' is the field you want from the category collection
                      }
                  }
      ]);
      categoryData.forEach((cat) => {
          categories.push(cat._id),
          categorySales.push(cat.sales)
      })
      let paymentData = await Orders.aggregate([
          { $match: { status: 'Delivered', paymentMethod: { $exists: true } }},
          { $group: { _id: '$paymentMethod', count: { $sum: 1 }}}
      ]);
      let paymentMethods = []
      let paymentCount = []
      paymentData.forEach((data) => {
          paymentMethods.push(data._id)
          paymentCount.push(data.count)
      })
      let orderDataToDownload = await Orders.find({ status: 'Delivered' }).sort({ createdAt: 1 })
      if(req.query.fromDate && req.query.toDate){
          const { fromDate, toDate } = req.query
          orderDataToDownload = await Orders.find({ status: 'Delivered', createdAt: { $gte: fromDate, $lte: toDate }}).sort({ createdAt: 1 })
      }
      const currentPage = 'Dashboard'; 
      res.render('admin/admin-dashboard',{
              page : 'Dashboard',
              totalUsersCount, 
              usersOntheMonth,
              totalSales,
              totalSalesCount,
              salesOnTheYear,
              totalIncome,
              thisMonthIncome,
              thisYearIncome,
              sales, 
              months, 
              salesYear, 
              displayYears,
              categories,
              categorySales,
              paymentMethods,
              paymentCount,
              orderDataToDownload,
              salesOnTheMonth,
              salesOnPrevMonth,
              currentPage
      })
  } catch (error) {
      next(error)
  }
}
exports.getUserData = async (req, res,next) => {
  try {
    const users = await User.find();
    res.render('admin/userProfile', { admin: req.session.admin, users });
  } catch (err) {
   next(err)
  }
};
;
exports.searchUsers = async (req, res,next) => {
  const { searchQuery } = req.body;
  try {
    const users = await User.find({ username: { $regex: searchQuery, $options: 'i' } });
    res.render('admin/userProfile', { admin: req.session.admin, users });
  } catch (error) {
    next(error)
  }
};
exports.getLogout = (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render('admin/admin-logout', { error });
};
exports.postLogout = async (req, res,next) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (admin) {
      const result = await bcrypt.compare(password, admin.password);
      if (result) {
        req.session.destroy();
        res.redirect('/admin/login');
      } else {
        req.session.error = 'Invalid admin details';
        res.redirect('/admin/logout');
      }
    } else {
      req.session.error = 'Invalid admin details';
      res.redirect('/admin/logout');
    }
  } catch (error) {
    next(error)
  }
};
exports.usersProfile = async (req, res,next) => {
  try {
    const admin = req.session.admin;
    if (!admin) { 
      res.redirect('/admin/login');
      return;
    }
    const users = await User.find();
    const currentPage = 'UsersProfile'; 
    res.render('admin/userProfile', { admin, users,currentPage }); 
  } catch (error) {
   next(error)
  }
};
exports.blockUnblockUser = async (req, res,next) => {
  try {
    const userId = req.body.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }
    const updatedBlockedStatus = !user.blocked;
    await User.findByIdAndUpdate(userId, { blocked: updatedBlockedStatus });
    res.redirect('/admin/usersProfile');
  } catch (error) {
    next(error)
  }
};
// controllers/adminController.js
const Order = require('../models/Order');
exports.ordersList = async (req, res,next) => {
  try {
    let pageNum = 1;
    if(req.query.pageNum){
        pageNum = parseInt(req.query.pageNum) 
    }
    let limit = 10;
    if(req.query.limit){
        limit = parseInt(req.query.limit);
    }
    const totalOrderCount = await Order.find({}).count()
    let pageCount = Math.ceil( totalOrderCount / limit)
    const orders  = await Order.find({}).populate('userId').populate('products.productId').sort({ createdAt: -1 }).skip( (pageNum - 1)*limit ).limit(limit);
    const currentPage = 'UsersOrders';
    res.render('admin/ordersList', { orders,pageCount, pageNum, limit,currentPage}); 
  } catch (error) {
   next(error)
  }
};
exports.orderDetails = async (req, res,next) => {
  const orderId = req.params.id;
  try {
    const orders = await Order.find().populate('user products.product');
    const userAddresses = await UserAddress.find();
    res.render('admin/ordersList', { orders, userAddresses });
  } catch (error) {
    next(error)
  }
};
exports.updateOrderStatus = async (req, res,next) => {
  const orderId = req.params.id;
  const { newStatus } = req.body;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.render('error', { message: 'Order not found' });
    }
    order.status = newStatus;
    await order.save();
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
   next(error)
  }
};
exports.approveReturn = async(req,res,next) => {
  try {
      const orderId = req.params.orderId;
      const orderData = await Order.findById({ _id: orderId })
      let refundAmount = 0;
      for (const pdt of orderData.products){
          if(pdt.status === 'Pending Return Approval' ){
              pdt.status = 'Returned'
              refundAmount = refundAmount + pdt.totalPrice
          }
      };
      if(orderData.status === 'Pending Return Approval' ){
        orderData.status = 'Returned'
        refundAmount = refundAmount + orderData.totalPrice
    }
      await orderData.save()
      await updateOrderStatus(orderId, next);
      const userId = orderData.userId;
      //Adding amount into users wallet
      await updateWallet(userId, refundAmount, 'Refund of Returned Order')
      res.redirect('/admin/UsersOrders')
  } catch (error) {
   next(error)
  }
}
exports.approveReturnForSinglePdt = async(req, res, next) => {
  try {
      const { orderId, pdtId } = req.params
      const orderData = await Order.findById({_id: orderId})
      const userId = orderData.userId;
      let refundAmount;
      for( const pdt of orderData.products){
          if(pdt._id == pdtId){
              pdt.status = 'Returned'
              refundAmount = pdt.totalPrice;
              break;
          }
      }
      await orderData.save()
      await updateOrderStatus(orderId, next);
      await updateWallet(userId, refundAmount, 'Refund of Retrned Product')
      res.redirect(`/UsersOrders`)
  } catch (error) {
    next(error)
  }
}
exports.changeOrderStatus = async (req, res,next) => {
  try {
    const orderId = req.body.orderId;
    const status = req.body.status;
    // Update the order's status field
    await Order.findByIdAndUpdate(orderId, { status: status });
    res.redirect('/admin//UsersOrders');
  } catch (error) {
    next(error)
  }
};
exports.cancelOrder = async(req,res,next) => {
  try {
      const orderId = req.params.orderId
      const cancelledBy = req.query.cancelledBy
      const orderData = await Order.findById({_id:orderId})
      const userId = orderData._id
      console.log(cancelledBy);
      if(cancelledBy == 'user'){
          await Order.findByIdAndUpdate(
              {_id: orderId},
              {
                  $set:{
                      status: 'Cancelled'
                  }
              }
          );
      }else if(cancelledBy == 'admin'){
          await Order.findByIdAndUpdate(
              {_id: orderId},
              {
                  $set:{
                      status: 'Cancelled By Admin'
                  }
              }
          );
      }
      if(cancelledBy == 'user'){
          res.redirect('/profile/myOrders')
      }else if(cancelledBy == 'admin'){
          res.redirect('/admin/UsersOrders')
      }
  } catch (error) {
     next(error)
  }
}
exports.viewAdminOrderDetails = async (req, res,next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.userId;
    const user = req.session.user;
    const orderData = await Order.findById({ _id: orderId })
    .populate('products.productId')
    let status;
    switch(orderData.status){
        case 'Order Confirmed':
            status = 1;
            break;
        case 'Shipped':
            status = 2;
            break;
        case 'Out For Delivery':
            status = 3;
            break;
        case 'Delivered':
            status = 4;
            break;
        case 'Cancelled' :
            status = 5;
            break;
        case 'Cancelled By Admin':
            status = 6;
            break;
        case 'Pending Return Approval':
            status = 7;
            break;
        case 'Returned':
            status = 8;
            break;
    }
    const currentPage = 'UsersOrders';
    res.render('admin/viewOrderDetails',{isLoggedIn:true, page :'Order Details',currentPage, parentPage: 'My Orders',orderData, status,user,orderId: orderId })
} catch (error) {
next(error)
}
};
exports.AdmincancelProduct = async (req, res, next) => {
  try {
      const orderId = req.params.orderId;
      const productId = req.params.productId;
      const orderData = await Order.findById(orderId);
      const productToCancel = orderData.products.find(pdt => pdt.productId.toString() === productId);
      if (productToCancel) {
          productToCancel.status = 'Cancelled';
      const allProductsCancelled = orderData.products.every(pdt => pdt.status === 'Cancelled');
      if (allProductsCancelled) {
        orderData.status = 'Cancelled By Admin';
      }
          const finalOrder = await orderData.save();
          res.redirect(`/admin/AdminviewOrderDetails/${orderId}`);
      } else {
          res.status(404).send('Product not found in the order');
      }
  } catch (error) {
      next(error);
  }
};
