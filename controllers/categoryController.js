const Categories = require('../models/categoryModel');
const Products = require('../models/productModel')
const Offers = require('../models/offerModel')
exports.getAllCategories = async (req, res) => {
  try {

   

    const categories = await Categories.find().populate('offer');
    const offerData = await Offers.find({ $or: [
      {status : 'Starting Soon'},
      {status : 'Available' }
  ]});
  const currentPage = 'Categories';
    res.render('category/categories', { categories ,nameError: '',page:'Categories', offerData,currentPage});
  } catch (error) {
    console.error(error);
    res.render('error');
  }
};

// exports.addCategory = async (req, res) => {
  // let { name } = req.body;

  // name = name.trim();

  // let nameError = '';

  // if (!name) {
  //   nameError = 'Category name is required.';
  // }

  // name = name.replace(/[^A-Z]/g, '');

  // try {
  //   if (name.length != 0 && !nameError) {
  //     await Category.create({ name });
  //     res.redirect('/admin/categories');
  //   } else {
  //     const categories = await Category.find();
  //     res.render('category/categories', { categories, nameError });
  //  }
  // } catch (error) {
  //   console.error(error);
  //   res.render('error');
  // }
// };

exports.addCategory = async(req, res, next) => {
  try {
      const categoryName = req.body.categoryName.toUpperCase()
      if(categoryName){

          const isExistCategory = await Categories.findOne({name:categoryName});

          if(isExistCategory){
              console.log('Category Already Exists');
              res.redirect('/admin/categories');
              
          }else{
              await new Categories({name : categoryName}).save()
              res.redirect('/admin/categories');
          }

      }else{
          console.log('Enter Category Name');
          res.redirect('/admin/categories');
      }

  } catch (error) {
              next(error);
  }
}




exports.editCategory = async(req, res, next) => {
  try {
      console.log('on edit category controller its working!');
      const id = req.body.categoryId
      const newName = req.body.categoryName.toUpperCase()

      const isCategoryExist = await Categories.findOne({name:newName})

      if(req.file){
          const image = req.file.filename
          if(!isCategoryExist || isCategoryExist._id == id){
              await Categories.findByIdAndUpdate({_id:id},{ $set :{ name: newName, image:image } })
          }
      }else{
          if(!isCategoryExist){
              await Categories.findByIdAndUpdate({_id:id},{ $set :{ name: newName } })
          }
      }

      res.redirect('/admin/categories')
  } catch (error) {
              next(error);
  }
}





exports.listCategory = async(req,res, next) => {
  try {
      const id = req.params.id;
      const categoryData = await Categories.findById({_id:id})

      if(categoryData){
          categoryData.isListed = !categoryData.isListed
          await categoryData.save()
      }
      res.redirect('/admin/categories')

  } catch (error) {
              next(error);
  }
}

exports.applyCategoryOffer = async(req, res, next) => {
  try {

      const { offerId, categoryId, override } = req.body

      //Setting offerId to offer field of category
      await Categories.findByIdAndUpdate(
          {_id:categoryId},
          {
              $set:{
                  offer: offerId
              }
          }
      );

      const offerData = await Offers.findById({_id:offerId})
      const products = await Products.find({category: categoryId})

      //applying offer to every product in the same category
      for(const pdt of products){

          const actualPrice = pdt.price - pdt.discountPrice;
          
          let offerPrice = 0;
          if(offerData.status == 'Available'){
              offerPrice = Math.round( actualPrice - ( (actualPrice*offerData.discount)/100 ))
          }
  
          if(override){
              await Products.updateOne(
                  { _id: pdt._id },
                  {
                      $set:{
                          offerPrice,
                          offerType: 'Offers',
                          offer: offerId,
                          offerAppliedBy: 'Category'
                      }
                  }
              );
          }else{
              await Products.updateOne(
                  {
                      _id: pdt._id,
                      offer: { $exists: false }
                  },
                  {
                      $set:{
                          offerPrice,
                          offerType: 'Offers',
                          offer: offerId,
                          offerAppliedBy: 'Category'
                      }
                  }
              );
          }

      }

      res.redirect('/admin/categories')

  } catch (error) {
      next(error)
  }
}


exports.removeCategoryOffer = async(req, res, next) => {
  try {
      const { catId } = req.params

      await Categories.findByIdAndUpdate(
          {_id:catId},
          {
              $unset: {
                  offer:''
              }
          }
      );

      //Unsetting every prodects that matches catId
      await Products.updateMany(
          {
              category: catId,
              offerAppliedBy: 'Category'
          },
          {
              $unset:{
                  offer:'',
                  offerType: '',
                  offerPrice:'',
                  offerAppliedBy:''
              }
          }
      );
      
      res.redirect('/admin/categories')

  } catch (error) {
      next(error)
  }
}
