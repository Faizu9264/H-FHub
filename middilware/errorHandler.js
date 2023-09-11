

const err404 = async(req, res, next) => {
    res.status(404);
    res.render("errors/404", { url: req.url });
}


const err500 = async(err, req, res, next) => {
    console.log(err);
    res.status(err.status || 500).render('errors/500')
}


module.exports = {
    err404,
    err500
}
