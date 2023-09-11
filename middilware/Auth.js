// const User = require('../models/User');

// async function UserLoggedIn(req, res, next) {
//   try {
//     if (req.session.user) {
//       const userId = req.session.user;
//       const user = await User.findOne({ _id: userId._id });

//       if (user && user.blocked === false) {
//         next();
//       } else {
//         req.session.destroy();
//         return res.redirect('/login');
//       }
//     } else {
//       return res.redirect('/');
//       // next();
//     }
//   } catch (err) {
//     console.log(err.message);
//     res.status(500).send('Internal Server Error');
//   }
// }



// function userNotLogged(req,res,next) {
//     try{
// if(req.session.user){
//     return res.redirect('/')
// }
// next()
//     }catch(err){
// console.log(err.message);
//     }
// }


// module.exports = {UserLoggedIn,userNotLogged}




const User = require('../models/User')


const isUserLoggedIn = (req, res, next) => {
    try {

        if(!req.session.userId){
            return res.redirect('/login')
        }
        next();

    } catch (error) {
        next(error)
    }
}

const isUserLoggedOut = async(req, res, next) => {
    try {

        if(req.session.userId){
            return res.redirect('/')
        }
        next();

    } catch (error) {
        next(error)
    }
}

const isUserBlocked = async(req, res, next) => {
    try {

        if(req.session.userId){
            const userData = await User.findById({_id : req.session.userId})
            
            let isUserBlocked = userData.blocked
            if(isUserBlocked){
                req.session.destroy()
                req.app.locals.message = 'You are blocked by admin';
                return res.redirect('/login')
            }
        }
        next();

    } catch (error) {
        next(error)
    }
}


const isAdminLoggedIn = (req, res, next) => {
    try {
        
        if(!req.session.admin){
            return res.redirect('/admin/login')
        }
        next();

    } catch (error) {
        next(error)
    }
}

const isAdminLoggedOut = async(req, res, next) => {
    try {

        if(req.session.admin){
            return res.redirect('/admin')
        }
        next();

    } catch (error) {
        next(error)
    }
}

module.exports = {
    isUserLoggedIn,
    isAdminLoggedIn,
    isUserBlocked,
    isUserLoggedOut,
    isAdminLoggedOut
}