const BrandOffers = require('../models/brandOfferModel')
const Products = require('../models/productModel')
const Categories = require('../models/categoryModel')
const Category = require('../models/categoryModel')

const loadBrandOffersList = async(req, res, next) => {
    try {
        const brandOffers = await BrandOffers.find()
        const currentPage = 'BrandOffers';
        res.render('admin/brandOffers',{ page: 'Brand Offers', brandOffers,currentPage })
    } catch (error) {
        next(error)
    }
}

const loadAddBrandOffer = async(req, res, next) => {
    try {
        console.log('load add brand offer');
        const currentPage = 'BrandOffers';
        const categories = await Categories.find({})
        // console.log(categories);
        let brands = await Products.aggregate([
            {
                $group: { 
                    _id: '$brand'
                }
            }
        ]);

        brands = brands.map((brand) => brand._id)

        
        res.render('admin/addBrandOffer',{ page: 'Brand Offers', categories, brands ,currentPage})
    } catch (error) {
        next(error)
    }
}

const postAddBrandOffer = async(req, res, next) => {
    try {
        console.log('post add brand offer');
        const { discount, expiryDate} = req.body
        const name = req.body.name.toUpperCase()
        const brand = req.body.brand
        const category = req.body.category
        console.log(category);

        const brandOfferData = await new BrandOffers({
            name, brand,
            discount, expiryDate,
            categoryId: category,
            status: 'Available'
        }).save()

        const products = await Products.find(
            {
                brand, category
            }
        );

        console.log(products);

        for(const pdt of products){

            const actualPrice = pdt.price - pdt.discountPrice;
            const offerPrice = Math.round( actualPrice - ( (actualPrice*discount)/100 ))

            await Products.updateOne(
                { _id: pdt._id }, // Update criteria
                {
                    $set: {
                        offer: brandOfferData._id,
                        offerType: 'BrandOffers',
                        offerPrice,
                        offerAppliedBy: 'Brand Offer'
                    }
                }
            );
            // pdt.offer = brandOfferData._id;
            // pdt.offerType = 'BrandOffers';
            // pdt.offerPrice = offerPrice;
            // pdt.offerAppliedBy = 'Brand Offer';

        }

        res.redirect('/admin/brandOffers');

    } catch (error) {
        next(error)
    }
}


const loadEditBrandOffer = async(req, res, next) => {
    try {
        console.log('load edit brand offer');
        const { brandOfferId } = req.params
        const currentPage = 'BrandOffers';
        const categories = await Categories.find()
        let brands = await Products.aggregate([
            {
                $group: { 
                    _id: '$brand'
                }
            }
        ]);

        brands = brands.map((brand) => brand._id)

        const brandOffer = await BrandOffers.findById({ _id: brandOfferId });

        res.render('admin/editBrandOffer',{ page: 'Brand Offers', brandOffer, categories, brands, currentPage})
    } catch (error) {
        next(error)
    }
}

const postEditBrandOffer = async(req, res, next) => {
    try {
        console.log('post edit brand offer');
        const { brandOfferId } = req.params
        const { discount, expiryDate} = req.body
        const name = req.body.name.toUpperCase()
        const brand = req.body.brand
        const category = req.body.category
        console.log("brand",brand);
        console.log("category",category);

       const BrandOffer = await BrandOffers.findByIdAndUpdate(
            { _id : brandOfferId },
            {
                $set:{
                    name, brand, discount, expiryDate, categoryId: category
                }
            }
        );
        console.log("BrandOffers",BrandOffer);

        const products = await Products.find({ brand:brand, category:category});
     

        if (!products) {
            console.log('No products found for the specified brand and category.');
          } else {
            console.log('Products:', products);
          }

        for(const pdt of products){

            const actualPrice = pdt.price - pdt.discountPrice;
            const offerPrice = Math.round( actualPrice - ( (actualPrice*discount)/100 ))


            await Products.updateOne(
                { _id: pdt._id }, // Update criteria
                {
                    $set: {
                        offer: brandOfferId,
                        offerType: 'BrandOffers',
                        offerPrice,
                        offerAppliedBy: 'Brand Offer'
                    }
                }
            );
            // pdt.offer = brandOfferId;
            // pdt.offerType = 'BrandOffers';
            // pdt.offerPrice = offerPrice;
            // pdt.offerAppliedBy = 'Brand Offer';

        }


        res.redirect('/admin/brandOffers')

    } catch (error) {
        next(error)
    }
}

const cancelBrandOffer = async( req, res, next ) => {
    try {
        const { brandOfferId } = req.params
        const brandOfferData = await BrandOffers.findById({_id:brandOfferId})

        const products = await Products.find({ 
            brand: brandOfferData.brand,
            category: brandOfferData.categoryId
        })

        if(brandOfferData.status === 'Available'){
            brandOfferData.status = 'Cancelled'

            for (const pdt of products) {
                await Products.updateOne(
                    { _id: pdt._id },
                    {
                        $unset: {
                            offer: '',
                            offerType: '',
                            offerPrice: '',
                            offerAppliedBy: ''
                        }
                    }
                );
            }

        }else if(brandOfferData.status === 'Cancelled'){

            brandOfferData.status = 'Available';
            
            for (const pdt of products) {

                const actualPrice = pdt.price - pdt.discountPrice;
                const offerPrice = Math.round(actualPrice - ((actualPrice * brandOfferData.discount) / 100));

                await Products.updateOne(
                    { _id: pdt._id }, // Update criteria
                    {
                        $set: {
                            offer: brandOfferId,
                            offerType: 'BrandOffers',
                            offerPrice,
                            offerAppliedBy: 'Brand Offer'
                        }
                    }
                );

            }
        }

        await brandOfferData.save()

        res.redirect('/admin/brandOffers')

    } catch (error) {
        next(error)
    }
}

module.exports = {
    loadBrandOffersList,
    loadAddBrandOffer,
    loadEditBrandOffer,
    postAddBrandOffer,
    postEditBrandOffer,
    cancelBrandOffer
}