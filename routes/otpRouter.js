const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const flash = require('express-flash');

router.use(flash());
// router.post('/generate-otp', otpController.generateAndSendOtp);

router.get('/verify-otp', async (req, res) => {
  const { email } = req.session.userData;
  const referral = req.body.referral.trim()
  res.render('verify-otp', { message: '', email,referral });
});


router.post('/check-otp', otpController.verifyOtpAndCreateUser);
router.post('/update-check-otp',otpController.verifyOtpAndUpdate)

router.get('/resendotp', otpController.resendOtp);



router.get('/forgot-password', otpController.getForgotPassword);
router.post('/forgot-password', otpController.postForgotPassword);
router.post('/update-password', otpController.updatePassword);

module.exports = router;
