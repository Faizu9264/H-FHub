const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name:{
    type : String,
    required : true
},
image:{
    type : String,
},
isListed:{
    type: Boolean,
    default: true
},
offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offers',
}
},
{
timestamps: true
});
const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
