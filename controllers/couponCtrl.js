const Coupons = require('../models/couponModel')
const  Cart = require('../models/Cart')
const User = require('../models/User')
const loadCoupons = async(req, res, next) => {
    try {
        const coupons = await Coupons.find()
        const currentPage = 'Coupons';
        res.render('admin/coupons',{page:'Coupons',coupons,currentPage})
    } catch (error) {
        next(error)
    }
}
const loadAddCoupon = async(req, res, next) => {
    try {
        const couponTypes = Coupons.schema.path('discountType').enumValues
        const currentPage = 'Coupons';
        res.render('admin/addCoupon',{page:'Coupons', couponTypes ,currentPage})
    } catch (error) {
        next(error)
    }
}
const postAddCoupon = async(req, res, next) => {
    try {
        const { discountAmount, discountType, maxDiscountAmount, minPurchase, expiryDate, description } = req.body;
        const code = req.body.code.toUpperCase()
        let couponCount;
        if(!req.body.couponCount){
            couponCount = undefined
        }else{
            couponCount = parseInt(req.body.couponCount)
        }
        const isCodeExist = await Coupons.findOne({code})
        if(!isCodeExist){
            await new Coupons({
                code, discountAmount, discountType, maxDiscountAmount, minPurchase, expiryDate, description, couponCount
            }).save()
        }else{
            console.log('Code already exist');
        }
        res.redirect('/admin/coupons')
    } catch (error) {
        next(error);
    }
}
const loadEditCoupon = async(req, res, next) => {
    try {
        const couponId = req.params.couponId;
        const couponData = await Coupons.findById({_id:couponId})
        const couponTypes = Coupons.schema.path('discountType').enumValues
        const currentPage = 'Coupons';
        res.render('admin/editCoupon',{couponData, page:'Coupons', couponTypes,currentPage})
    } catch (error) {
        next(error)
    }
}
const postEditCoupon = async(req, res, next) => {
    try {
        const couponId = req.params.couponId;
        const { discountAmount, discountType, maxDiscountAmount, minPurchase, expiryDate, description, couponCount } = req.body;
        const code = req.body.code.toUpperCase()
        const isCodeExist = await Coupons.findOne({code})
        if(!isCodeExist || isCodeExist._id == couponId){
            await Coupons.findByIdAndUpdate(
                { _id: couponId },
                {
                    $set:{
                        code, discountAmount, discountType, maxDiscountAmount, minPurchase, expiryDate, description, couponCount
                    }
                }
            );
        }else{
            console.log('Code already exist, update expiry date if you want to add same code again');
        }
        res.redirect('/admin/coupons');
    } catch (error) {
        next(error)
    }
}
const cancelCoupon = async(req, res, next) => {
    try {
        const couponId = req.params.couponId;
        const couponData = await Coupons.findById({_id:couponId})
        couponData.isCancelled = !couponData.isCancelled
        await couponData.save()
        res.redirect('/admin/coupons');
    } catch (error) {
        next(error)
    }
}
const applyCoupon = async(req, res, next) => {
    try {
        const userId = req.session.userId;
        const code = req.body.code.toUpperCase()
        const couponData = await Coupons.findOne({code})
        let userData = await User.findById({_id:userId}).populate('cart.productId')
        const cartData = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cartData) {
            return res.json({ status: false, message: 'Cart not found' });
        }
        const cartItems = cartData.items;
        // Finding total cart price
        let totalPrice = 0;
        let totalDiscountPrice = 0;
        cartItems.forEach(cartItem => {
            totalPrice += cartItem.product.price * cartItem.quantity;
            if (cartItem.product.offerPrice) {
                totalDiscountPrice += (cartItem.product.price - cartItem.product.offerPrice) * cartItem.quantity;
            } else {
                totalDiscountPrice += cartItem.product.discountPrice * cartItem.quantity;
            }
        });
        const cartAmount = totalPrice - totalDiscountPrice;
        if(couponData && !couponData.isCancelled){
            if(cartAmount >= couponData.minPurchase){
                if(couponData.expiryDate >= new Date()){
                    if(couponData.couponCount >= couponData.usedUsers.length){
                        const isCodeUsed = couponData.usedUsers.find( id => id == userId);
                        if(!isCodeUsed){
                            req.session.coupon = couponData;
                            let payAmount;
                            if(couponData.discountType === 'Fixed Amount'){
                                payAmount = cartAmount - couponData.discountAmount
                            }else if(couponData.discountType === 'Percentage'){
                                const reducePrice = cartAmount* (couponData.discountAmount / 100);
                                if(reducePrice >= couponData.maxDiscountAmount){
                                    payAmount = cartAmount - couponData.maxDiscountAmount
                                }else{
                                    payAmount =  cartAmount - reducePrice
                                }
                            }
                            const couponDiscount = cartAmount - payAmount
                            let isWalletHasPayAmount = false
                            if(userData.wallet >= payAmount){
                                isWalletHasPayAmount = true
                            }
                            res.json({
                                status:true, 
                                message: 'Success',
                                couponDiscount,
                                payAmount,
                                isWalletHasPayAmount
                            });
                        }else{
                            res.json({status:false, message:'Coupon already used'})
                        }
                    }else{
                        res.json({status: false, message: `Coupon Limit exceeded, try another one`})
                    }
                }else{
                    res.json({status:false, message:`Coupon expired`})
                }
            }else{
                res.json({status:false, message:`Min purchase should be greaterthan or equal to ${couponData.minPurchase}`})
            }
        }else{
            res.json({status:false, message:"Coupon doesn't exist"})
        }
    } catch (error) {
        next(error)
    }
}
const removeCoupon = async(req, res, next) => {
    try {
        req.session.couponData = null
        res.json({ status: true })
    } catch (error) {
        next(error)
    }
}
module.exports = {
    loadCoupons,
    loadAddCoupon,
    postAddCoupon,
    loadEditCoupon,
    postEditCoupon,
    cancelCoupon,
    applyCoupon,
    removeCoupon
}