const Order = require('../models/Order');
const User = require('../models/User')
const Product = require('../models/productModel')
const UserAddress = require('../models/UserAddress');
const Cart = require('../models/Cart')
require('dotenv').config()
const Razorpay = require('razorpay');
const { log } = require('console');
const Coupons = require('../models/couponModel')
const { updateWallet } = require('../helpers/helpersFunctions')
var instance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret:  process.env.KEY_SECRET,
});
exports.order = async (req, res,next) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect('/');
    }
    try {
        const orderData = await Order.find({ userId: req.session.user._id }).populate('products.productId').sort({createdAt: -1})
        return res.render('user/order', { orderData, user });
    } catch (error) {
  next(error)
    }
};
  exports.cancelProductOrder= async (req, res,next) => {
    const orderId = req.params.orderId;
    const productId = req.params.productId;
    const user = req.session.user;
    if (!user) {
      return res.redirect('/');
    }
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      // Find the product to cancel
      const productIndex = order.products.findIndex(item => item._id.toString() === productId);
      if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found in order.' });
      }
      // Remove the product from the order
      order.products.splice(productIndex, 1);
      await order.save();
      return res.redirect(`/orders?userId=${user._id}`);
    } catch (error) {
      next(error)
    }
  };
  exports.placeOrder = async(req, res,next) => {
    try {
        //getting details needed
        const addressId = req.body.address
        const selectedPaymentMethod = Array.isArray(req.body.payment) ? req.body.payment[0] : req.body.payment;
        const  selectedAddressId = req.body.selectedAddress
        const isWalletSelected = req.body.walletCheckBox
        const userId = req.session.userId
        const userAddress = await UserAddress.findOne({ user: userId });
        if (!userAddress) {
            return res.status(404).json({ error: 'No address found for the user.' });
        }
        let selectedAddress = null;
        for (const address of userAddress.addresses) {
            if (address._id.toString() === selectedAddressId) { // Match the selected address ID
                selectedAddress = address;
                break;
            }
        }
        if (!selectedAddress) {
            return res.status(404).json({ error: 'Selected address not found.' });
        }
        req.session.deliveryAddress = selectedAddress;
        //getting cart items
        const cartItems = await Cart.findOne({ user: userId }).populate('items.product');
        const cart = cartItems.items;
        for (const cartItem of cart) {
            await Product.updateOne(
              { _id: cartItem.product._id },
              { $inc: { salesCount: cartItem.quantity } } 
            );
          }
        req.session.cart = cartItems._id;
        const userData = await User.findById({_id:userId}).populate('cart.productId')
        const walletAmount = req.session.walletAmount = parseInt(userData.wallet)
    let products = [];
    cart.forEach((pdt) => {
      let discountPrice;
      let totalDiscount;
      if (pdt.product.offerPrice !== undefined) {
          discountPrice = pdt.product.price - pdt.product.offerPrice;
          totalDiscount = discountPrice * pdt.quantity;
      } else if (pdt.product.discountPrice !== undefined) {
          discountPrice = pdt.product.discountPrice;
          totalDiscount = pdt.quantity * pdt.product.discountPrice;
      } else {
          // Handle the case where neither offerPrice nor discountPrice is defined
          discountPrice = 0;
          totalDiscount = 0;
      }
      const product = {
        productId: pdt.product._id,
          productName: pdt.product.name,
          productPrice: pdt.product.price,
          discountPrice,
          quantity: pdt.quantity,
          totalPrice: pdt.quantity * pdt.product.price,
          totalDiscount,
      };
      products.push(product);
  });
    req.session.products = products;
        if(cart.length){
  let totalPrice = 0;
  let totalDiscount = 0;
  products.forEach((product) => {
    totalPrice += product.totalPrice;
    totalDiscount += product.totalDiscount;
  });
  totalPrice -= totalDiscount;
  if (req.session.coupon != null) {
    await Coupons.findByIdAndUpdate(
        { _id: req.session.coupon._id },
        {
            $push: {
                usedUsers: userId
            }
        }
    );
}
  let couponCode = '';
  let couponDiscount = 0;
  let couponDiscountType;
  if (req.session.coupon) {
      const coupon = req.session.coupon;
      couponCode = coupon.code;
      couponDiscount = coupon.discountAmount;
      if (coupon.discountType === 'Percentage') {
          couponDiscountType = 'Percentage';
          const reducePrice = totalPrice * (couponDiscount / 100);
          if (reducePrice >= coupon.maxDiscountAmount) {
              couponDiscount = coupon.maxDiscountAmount;
          } else {
              couponDiscount = reducePrice;
          }
      } else {
          couponDiscountType = 'Fixed Amount';
          if (couponDiscount > totalPrice) {
              couponDiscount = totalPrice;
          }
      }
  }
  // Update totalPrice based on couponDiscount
  totalPrice -= couponDiscount;
            req.session.isWalletSelected = isWalletSelected;
            req.session.totalPrice = totalPrice;
            // console.log("hi 1");
            if(selectedPaymentMethod === 'COD'){
               const  savedOrder =  await new Order({
                    userId, 
                    deliveryAddress: selectedAddress,
                    totalPrice,
                    products, 
                    paymentMethod:selectedPaymentMethod,
                    status: 'Order Confirmed',
                    date: new Date(),
                    couponCode,
                    couponDiscount,
                    couponDiscountType
                }).save()
                const orderId = savedOrder._id;
                //Reducing quantity/stock of purchased products from Products Collection
                for (const { product, quantity } of cart) {
                    await Product.updateOne(
                        { _id: product._id },
                        { $inc: { stock: -quantity } }
                    );
                }
                // Deleting Cart from user collection
             await Cart.findOneAndRemove({ user: userId });
                req.session.cartCount = 0;
                res.json({ status: 'COD', orderId: orderId });
            }
            else if(selectedPaymentMethod === 'Razorpay'){
              var options = {
                  amount: Math.round(totalPrice*100),
                  currency:'INR',
                  receipt: "hello"
              }
              instance.orders.create(options, (err, order) => {
                  if(err){
                      console.log(err);
                  }else{
                      res.json({ status: 'Razorpay', order:order })
                  }
              })
            }
            else if(selectedPaymentMethod == 'Wallet'){
                const savedOrder = await new Order({
                    userId, 
                    deliveryAddress: selectedAddress,
                    totalPrice,
                    products, 
                    paymentMethod:selectedPaymentMethod,
                    status: 'Order Confirmed',
                    date: new Date(),
                    couponCode,
                    couponDiscount,
                    couponDiscountType
                }).save()
                const orderId = savedOrder._id;
                //Reducing quantity/stock of purchased products from Products Collection
                for (const cartItem of cart) {
                    await Product.updateOne(
                        { _id: cartItem.productId },
                        { $inc: { quantity: -cartItem.quantity } }
                    );
                }
                // Deleting Cart from user collection
             await Cart.findOneAndRemove({ user: userId });
                //Adding user to usedUsers list in Coupons collection
                if(req.session.coupon != null){
                    await Coupons.findByIdAndUpdate(
                        {_id:req.session.coupon._id},
                        {
                            $push:{
                                usedUsers: userId
                            }
                        }
                    )
                }
                req.session.cartCount = 0;
                // Decrementing wallet amount
                await User.findByIdAndUpdate(
                    { _id: userId },
                    {
                        $inc: {
                            wallet: -totalPrice
                        }
                    }
                );
                res.json({ status: 'Wallet', orderId: orderId });
            }
        }else{
            console.log('Cart is empty');
            res.redirect('/shop')
        }
    } catch (error) {
      next(error)
    }
  }
  exports.verifyPayment = async(req,res,next) => {
    try {
        const userId = req.session.userId;
        const details = req.body
        const keys = Object.keys(details)
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256', process.env.KEY_SECRET);
        hmac.update(details.response.razorpay_order_id + '|' + details.response.razorpay_payment_id);
        hmac = hmac.digest('hex');
        if (hmac === details.response.razorpay_signature) {
            let totalPrice = req.session.totalPrice
            const coupon = req.session.coupon
            let couponCode = '';
            let couponDiscount = 0;
            let couponDiscountType; 
            if(coupon){
                couponCode = coupon.code
                couponDiscount = coupon.discountAmount
                couponDiscountType = coupon.discountType
            }
            const savedOrder =  await new Order({
                userId, 
                deliveryAddress: req.session.deliveryAddress,
                totalPrice,
                products:  req.session.products, 
                paymentMethod:'Razorpay',
                status: 'Order Confirmed',
                date: new Date(),
                couponCode,
                couponDiscount,
                couponDiscountType,
            }).save()
            const orderId = savedOrder._id;
            //Reducing quantity/stock of purchased products from Products Collection
            const cartItems = await Cart.findOne({ user: userId }).populate('items.product');
            const cart = cartItems.items
            for (const { productId, quantity } of cart) {
                await Product.updateOne(
                    { _id: productId },
                    { $inc: { quantity: -quantity } }
                );
            }
            //Deleting Cart from user collection
            await Cart.findOneAndRemove({ user: userId });
            req.session.cartCount = 0;
            res.json({ status:true,orderId:orderId })
        }else{
            res.json({status:false})
        }
    } catch (error) {
      next(error)
    }
}
exports.loadViewOrderDetails = async(req, res,next) => {
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
        res.render('user/orderDetails',{isLoggedIn:true, page :'Order Details', parentPage: 'My Orders',orderData, status,user,orderId: orderId })
    } catch (error) {
     next(error)
    }
}
exports.cancelSinglePdt =  async(req, res, next) => {
    try {
        const { orderId, pdtId } = req.params
        const { cancelledBy } = req.query
        const orderData = await Order.findById({_id: orderId})
        const userId = orderData.userId
        let refundAmount = 0;
        for( const pdt of orderData.products){
            if(pdt._id ==  pdtId){
                if(cancelledBy == 'admin'){
                    pdt.status = 'Cancelled By Admin'
                }else if(cancelledBy == 'user'){
                    pdt.status = 'Cancelled'
                }
                refundAmount = pdt.totalPrice
                //Incrementing Product Stock
                await Product.findByIdAndUpdate(
                    {_id: pdt.productId},
                    {
                        $inc:{
                            quantity: pdt.quantity
                        }
                    }
                );
                break;
            }
        }
        await orderData.save()
        await updateOrderStatus(orderId, next);
        await updateWallet(userId, refundAmount, 'Refund of Order Cancellation')
        if(cancelledBy == 'admin'){
            res.redirect(`/admin/UsersOrders`)
        }else if(cancelledBy == 'user'){
            res.redirect(`/viewOrderDetails/${orderId}`)
        }
    } catch (error) {
        next(error.message)
    }
}
exports.returnOrder = async(req, res, next) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId
        await Order.findByIdAndUpdate(
            {_id: orderId},
            {
                $set:{
                    status: 'Pending Return Approval'
                }
            }
        );
        res.redirect(`/viewOrderDetails/${orderId}`)
    } catch (error) {
        next(error);
    }
}
exports.returnSinglePdt = async(req, res, next) => {
    try {
        const { orderId, pdtId } = req.params
        const orderData = await Order.findById({_id: orderId})
        for( const pdt of orderData.products){
            if(pdt._id == pdtId){
                pdt.status = 'Pending Return Approval'
                break;
            }
        }
        await orderData.save()
        await updateOrderStatus(orderId, next);
        res.redirect(`/viewOrderDetails/${orderId}`)
    } catch (error) {
        next(error)
    }
}
exports.loadInvoice = async(req,res, next) => {
    try {
         const user = req.session.user
        const { orderId } = req.params
        const isLoggedIn = Boolean(req.session.userId)
        const order = await Order.findById({_id: orderId})
        let discount;
        if(order.couponCode && order.couponDiscountType == 'Percentage'){
            // if(order.couponDiscountType == 'Percentage'){
            // }
            // discount = Math.floor(order.totalPrice/( 1- (order.couponDiscount/100)))
            discount = order. couponDiscount
            // discount = order.couponDiscount
        }else  {
        }
        // let discount;
        // if(order.coupon){
        //     // discount = Math.floor(order.totalPrice/( 1- (order.couponDiscount/100)))
        // }
        res.render('user/invoice',{order, isLoggedIn, page:'Invoice', discount , user})
    } catch (error) {
        next(error)
    }
}
const approveReturnForSinglePdt = async(req, res, next) => {
    try {
        const { orderId, pdtId } = req.params
        const orderData = await Order.findById({_id: orderId})
        const userId = orderData.userId;
        let refundAmount;
        for( const pdt of orderData.products){
            if(pdt._id == pdtId){
                pdt.status = 'Returned'
                refundAmount = pdt.totalPrice;
                //Incrementing Product Stock
                await Product.findByIdAndUpdate(
                    {_id: pdt.productId},
                    {
                        $inc:{
                            quantity: pdt.quantity
                        }
                    }
                );
                break;
            }
        }
        await orderData.save()
        await updateOrderStatus(orderId, next);
        await updateWallet(userId, refundAmount, 'Refund of Retrned Product')
        res.redirect(`/admin/ordersList`)
    } catch (error) {
        next(error)
    }
}
const updateOrderStatus = async function (orderId, next) {
    try {
            let statusCounts = []
            const orderData = await Order.findById({ _id: orderId })
            orderData.products.forEach((pdt) => {
                let eachStatusCount = {
                    status: pdt.status,
                    count: 1,
                };
                let existingStatusIndex = statusCounts.findIndex(
                    (item) => item.status === pdt.status
                );
                if (existingStatusIndex !== -1) {
                    // Increment the count of an existing status
                    statusCounts[existingStatusIndex].count += 1;
                } else {
                    statusCounts.push(eachStatusCount);
                }
            });
            if(statusCounts.length === 1){
                orderData.status = statusCounts[0].status
                await orderData.save()
                return
            }
            let isOrderConfirmedExists = false;
            let isShippedExists = false;
            let isOutForDeliveryExists = false;
            let isDeliveredExists = false;
            let cancelledByUserCount; 
            let cancelledByAdminCount;
            let returnApprovalCount;
            let returnedCount;
            statusCounts.forEach((item) => {
                if(item.status === 'Order Confirmed'){
                    isOrderConfirmedExists = true
                }
                if(item.status === 'Shipped'){
                    isShippedExists = true
                }
                if(item.status === 'Out For Delivery'){
                    isOutForDeliveryExists = true
                }
                if(item.status === 'Delivered'){
                    isDeliveredExists = true
                }
                if(item.status === 'Cancelled'){
                    cancelledByUserCount = item.count
                }
                if(item.status === 'Cancelled By Admin'){
                    cancelledByAdminCount = item.count
                }
                if(item.status === 'Pending Return Approval'){
                    returnApprovalCount = item.count
                }
                if(item.status === 'Returned'){
                    returnedCount = item.count
                }
            });
            if(isOrderConfirmedExists){
                orderData.status = 'Order Confirmed'
                await orderData.save()
                return
            }
            if(isShippedExists){
                orderData.status = 'Shipped'
                await orderData.save()
                return
            }
            if(isOutForDeliveryExists){
                orderData.status = 'Out For Delivery'
                await orderData.save()
                return
            }
            if(isDeliveredExists){
                orderData.status = 'Delivered'
                await orderData.save()
                return
            }
            let cancelledCount = 0;
            if(cancelledByUserCount){
                cancelledCount += cancelledByUserCount
            }
            if(cancelledByAdminCount){
                cancelledCount += cancelledByAdminCount
            }
            if(cancelledByUserCount === orderData.products.length || cancelledCount === orderData.products.length){
                orderData.status = 'Cancelled'
                await orderData.save()
                return;
            }
            if(cancelledByAdminCount === orderData.products.length){
                orderData.status = 'Cancelled By Admin'
                await orderData.save()
                return;
            }
            if( cancelledCount + returnApprovalCount + returnedCount === orderData.products.length){
                orderData.status = 'Pending Return Approval'
                await orderData.save()
                return;
            }
            if( cancelledCount + returnedCount === orderData.products.length){
                orderData.status = 'Returned'
                await orderData.save()
                return;
            }
    } catch (error) {
        next(error)
    }
}
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
    const currentPage = 'UsersOrders';
    res.render('admin/ordersList', { orders, userAddresses ,currentPage});
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
    // console.error(error);
    // res.render('error');
  }
};
exports.approveReturn = async(req,res,next) => {
    try {
        const orderId = req.params.orderId;
        //Changing status into Returned
        const orderData = await Order.findByIdAndUpdate(
            {_id:orderId},
            {
                $set:{
                    status: 'Returned'
                }
            }
        );
        const userId = orderData.userId;
        //Adding amount into users wallet
        const walletHistory = {
            date: new Date(),
            amount: orderData.totalPrice,
            message: 'Refund of Returned Order'
        }
        await User.findByIdAndUpdate(
            {_id:userId},
            {
                $inc:{
                    wallet: orderData.totalPrice
                },
                $push:{
                    walletHistory
                }
            }
        );
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
                //Incrementing Product Stock
                await Product.findByIdAndUpdate(
                    {_id: pdt.productId},
                    {
                        $inc:{
                            quantity: pdt.quantity
                        }
                    }
                );
                break;
            }
        }
        await orderData.save()
        await updateOrderStatus(orderId, next);
        await updateWallet(userId, refundAmount, 'Refund of Retrned Product')
        res.redirect(`/admin/UsersOrders`)
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
exports.cancelOrder = async(req,res, next) => {
    try {
        const orderId = req.params.orderId
        const cancelledBy = req.query.cancelledBy
        const orderData = await Order.findById({_id:orderId})
        const userId = orderData.userId
        // console.log(cancelledBy);
        let refundAmount = 0;
        if(cancelledBy == 'user'){
            for (const pdt of orderData.products){
                if(pdt.status !== 'Delivered' && 
                    pdt.status !== 'Pending Return Approval' &&
                    pdt.status !== 'Cancelled' && 
                    pdt.status !== 'Cancelled By Admin' && 
                    pdt.status !== 'Returned'
                ){
                    pdt.status = 'Cancelled'
                    refundAmount = refundAmount + pdt.totalPrice
                    //Incrementing Product Stock
                    await Product.findByIdAndUpdate(
                        {_id: pdt.productId},
                        {
                            $inc:{
                                quantity: pdt.quantity
                            }
                        }
                    );
                }
            };
            await orderData.save();
            await updateOrderStatus(orderId, next);
        }else if(cancelledBy == 'admin'){
            for (const pdt of orderData.products){
                if(pdt.status !== 'Delivered' && 
                    pdt.status !== 'Pending Return Approval' &&
                    pdt.status !== 'Cancelled' && 
                    pdt.status !== 'Cancelled By Admin' && 
                    pdt.status !== 'Returned'
                ){
                    pdt.status = 'Cancelled By Admin'
                    refundAmount = refundAmount + pdt.totalPrice
                    //Incrementing Product Stock
                    await Product.findByIdAndUpdate(
                        {_id: pdt.productId},
                        {
                            $inc:{
                                quantity: pdt.quantity
                            }
                        }
                    );
                }
            };
        }
        await orderData.save();
        await updateOrderStatus(orderId, next);
        //Updating wallet if order not COD
        if(orderData.paymentMethod !== 'COD'){
            await updateWallet(userId, refundAmount, 'Refund of Order Cancellation' )
        }
        if(cancelledBy == 'user'){
            res.redirect(`/viewOrderDetails/${orderId}`)
        }else if(cancelledBy == 'admin'){
            res.redirect('/admin//UsersOrders')
        }
    } catch (error) {
      next(error);
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
    res.render('admin/viewOrderDetails',{isLoggedIn:true, page :'Order Details', parentPage: 'My Orders',orderData, status,user,orderId: orderId })
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
