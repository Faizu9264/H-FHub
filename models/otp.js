const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  otp_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OTP', otpSchema);
