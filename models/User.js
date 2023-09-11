const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart'
},
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  wallet:{
    type : Number,
    default : 0
},
walletHistory : [{
    date : {
        type : Date,
    },
    amount : {
        type : Number
    },
    message : {
        type : String
    }
}],
wishlist:[{
  type : mongoose.Schema.Types.ObjectId,
  ref: 'Product'
}],
referralCode:{
  type: String,
  required : true,
  unique : true
},
referredBy:{
  type: String,
  readOnly: true
}
  
});

const User = mongoose.model('User', userSchema);


module.exports = User;
