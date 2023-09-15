const otpService = require('../services/otpService');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { getOTP, getReferralCode, securePassword } = require('../helpers/generator')
const { updateWallet } = require('../helpers/helpersFunctions')
exports.verifyOtpAndCreateUser = async (req, res) => {
  try {
    const enteredOtp = req.body.val1 + req.body.val2 + req.body.val3 + req.body.val4 + req.body.val5 + req.body.val6;
    const generatedOtp = req.session.otp;
    const referral = req.body.referral.trim();
    if (enteredOtp !== generatedOtp) {
      return res.render('user/verify-otp', { message: 'Invalid OTP', referral, email: req.session.userData.email });
    }
    if (req.session.userData) {
      const { username, password, email } = req.session.userData;
      const user = await User.findOne({ email });
      if (user) {
        req.flash('error', 'User with this email already exists');
        return res.redirect('/login');
      }
      if (!username || !password) {
        return res.render('verify-otp', { message: 'Username and password are required', email, referral });
      }
      const referralCode = await getReferralCode();
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      if (referral) {
        const isReferrerExist = await User.findOne({ referralCode: referral });
        if (isReferrerExist) {
          let referrerId = isReferrerExist._id;
          const walletHistory = {
            date: new Date(),
            amount: 100,
            message: 'Joining Bonus',
          };
             await new User({
            username: username,
            password: hashedPassword,
            email: email,
            referralCode,
            referredBy: referral,
            wallet: 100,
            walletHistory,
            isVerified: true,
          }).save();
          updateWallet(referrerId, 100, 'Refferal Reward');
        }
      } else {
        await User.create({
          username: username,
          password: hashedPassword,
          // referralCode,
          email: email,
          isVerified: true, 
        });
      }
      req.flash('success', 'Account created Successfully');
      req.session.userLoggedIn = true;
      return res.redirect('/');
    }
    return res.render('verify-otp', { message: 'Session Expired', referral, email: req.session.userData.email });
  } catch (error) {
    console.error(error);
    return res.render('verify-otp', { message: 'An error occurred during OTP verification', referral, email: req.session.userData.email });
  }
};
exports.resendOtp = async (req, res,next) => {
    try {
      const { email } = req.session.userData;
      const otp = otpService.generateOtp();
      const referral = req.session.userData.referral
      req.session.otp = otp;
      await otpService.sendOtp(email, otp);
      setTimeout(() => {
        req.session.otp = null; // Or delete req.session.otp;
    }, 600000); 
     return res.render('user/verify-otp',{ referral})
    } catch (error) {
      next(error);
    }
  };
  exports.getForgotPassword = (req, res,next) => {
    try{
      res.render('user/forgot-password',{ error: req.flash('error') });
    }catch(error){
    next(error)
    }
  };
  exports.postForgotPassword = async (req, res,next) => {
    try {
      const { email } = req.body;
     const referral = req.body.referral;
      if (email.trim()  === '' ) {
          req.flash('error',"Email  is required");
          return res.redirect('/forgot-password');
      } 
      const user = await User.findOne({ email });
      if (!user) {
        req.flash('error', 'No user found with this email address.');
        return res.redirect('/forgot-password');
      }
      const otp = otpService.generateOtp();
      req.session.otp = otp;
      req.session.resetUserData = { email, otp }; // Store email and OTP in the session
      await otpService.sendOtp(email, otp);
      res.render('user/verify', { email, message: '' ,referral});
    } catch (error) {
      next(error)
    }
  };
  exports.updatePassword = async (req, res,next) => {
    try {
      const { email, newPassword } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        req.flash('error', 'User not found.');
        return res.redirect('/forgot-password');
      }
      // const { otp } = req.session.resetUserData;
      // if (req.body.enteredOtp !== otp) {
      //   req.flash('error', 'Invalid OTP.');
      //   return res.redirect('/verify'); 
      // }
      // Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      // Update the user's password
      user.password = hashedPassword;
      await user.save();
      // Clear the resetUserData from the session
      delete req.session.resetUserData;
      req.flash('success', 'Password updated successfully.');
      res.redirect('/login'); // Redirect to the login page
    } catch (error) {
      next(error)
    }
  };
  exports.verifyOtpAndUpdate = async (req, res) => {
    try {
      const enteredOtp = req.body.val1 + req.body.val2 + req.body.val3 + req.body.val4 + req.body.val5 + req.body.val6;
      const generatedOtp = req.session.otp;
      if (enteredOtp !== generatedOtp) {
        return res.render('user/verify', { message: 'Invalid OTP', email: req.session.resetUserData.email });
      }
      // Check if resetUserData is available, indicating a password reset flow
      if (req.session.resetUserData) {
        const { email } = req.session.resetUserData;
        return res.render('user/update-password', { email });
      }
      if (req.session.resetuserData) {
        const { username, password, email } = req.session.userData;
        const user = await User.findOne({ email });
        if (user) {
          req.flash('error', 'User with this email already exists');
          return res.redirect('/login');
        }
        if (!username || !password) {
          return res.render('verify', { message: 'Username and password are required', email });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await User.create({
          username: username,
          password: hashedPassword,
          email: email,
          isVerified: true, // Mark the user as verified since OTP validation was successful
        });
        req.flash('success', 'Account created Successfully');
        req.session.userLoggedIn = true;
        return res.redirect('/');
      }
      return res.render('verify', { message: 'Session Expired', email: req.session.userData.email });
    } catch (error) {
      console.error(error);
      return res.render('verify', { message: 'An error occurred during OTP verification', email: req.session.userData.email });
    }
  };
  