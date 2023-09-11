const express = require('express');
const app = express();
const session = require('express-session');
const flash = require('express-flash');
const path = require('path');
const otpRouter = require('./routes/otpRouter');
const adminRoutes = require('./routes/adminRoutes');
// const multer = require('multer');
const cors=require('cors')
// const productRoutes = require('./routes/productRoutes');
// const categoryRoutes = require('./routes/categoryRoutes');
const bodyParser = require('body-parser');
const nocache = require('nocache')

const { err404, err500 } = require('./middilware/errorHandler')

const indexRouter = require('./routes/index');
const authRouter = require('./routes/authRoutes');
// const userRouter = require('./routes/userRoutes');
const connectDB = require('./db');

connectDB();



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(nocache())
app.use(cors())

// app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: true
}));

app.use(flash());
app.use(otpRouter);
app.use('/css2', express.static(path.join(__dirname, 'public/css2')));
// app.use('/css', express.static(path.join(__dirname, 'public/css')));


// app.use('/', categoryRoutes);
// app.use('/products', productRoutes);
app.use('/', indexRouter);
app.use('/', authRouter);
// app.use('/', userRouter);
app.use('/admin', adminRoutes);

app.use(err404)
app.use(err500)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});