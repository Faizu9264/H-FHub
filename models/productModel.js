const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true
},
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: [String],
  listed: {
    type: Boolean,
    default: true,
  },
  category:{
    type:mongoose.Types.ObjectId,
    ref:'Category'
  },
  quantity:{
    type:Number,
    default: 1,
  },
  discountPrice:{
    type:Number,
    required:true,
  },
  stock: {
    type: Number,
    default: 0,
  },
  salesCount: {
    type: Number,
    default: 0,
  },
  reviews:[{
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title:{
        type: String
    },
    description:{
        type: String
    },
    rating:{
        type: Number
    },
    createdAt:{
        type: Date
    }
}],
totalRating:{
    type: Number,
    default: 0
},
// offer:{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Offers'
// },
offerType: {
    type: String,
    enum: ['Offers', 'BrandOffers'],
    required: function(){
        this.offer !== ''
    }
},
offer:{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'offerType'
},
offerPrice: { type: Number },
offerAppliedBy: { 
    type: String
}
});
const Product = mongoose.model('Product', productSchema);
module.exports = Product;
