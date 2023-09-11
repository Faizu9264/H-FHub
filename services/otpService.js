








// const nodemailer = require('nodemailer');
// // const User = require('../models/User');
// const dotenv = require('dotenv')
// dotenv.config();

// const generateOtp = () => {
// const otp = Math.floor(100000 + Math.random() * 900000);
// // console.log("generatedOtp",generatedOtp);
// return otp.toString();
// };

// const sendOtp = async (recipientEmail, otp) => {
// try {
// const transporter = nodemailer.createTransport({
// host: 'smtp.gmail.com',
// port: 587,
// secure: false, 
// auth: {
// user: 'www.faizu9264@gmail.com',
// pass: process.env.GMAIL_PASSWORD,
// },
// });

// const mailOptions = {
// from: 'www.faizu9264@gmail.com', 
// to: recipientEmail, 
// subject: 'OTP Verification',
// text: `Your OTP is: ${otp}`,
// };

// const info = await transporter.sendMail(mailOptions);
// console.log('Email sent:', info.response);
// } catch (error) {
// console.error('Error sending email:', error);
// }
// };

// const sendContactMail = async(name, userMail, subject, message) => {
//     try {
//         console.log('hy');
//         const mailOptions = {
//             from: userMail,
//             to: 'www.faizu9264@gmail.com',
//             subject: subject,
//             html: `<h4>Hi I'm ${name}</h4><br><p>${message}</p>`
//         }

//         transporter.sendMail(mailOptions)

//     } catch (error) {
//         throw error
//     }
// }

// module.exports = { generateOtp, sendOtp ,sendContactMail};




const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'www.faizu9264@gmail.com',
    pass: process.env.GMAIL_PASSWORD,
  },
});

const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};

const sendOtp = async (recipientEmail, otp) => {
  try {
    const mailOptions = {
      from: 'www.faizu9264@gmail.com',
      to: recipientEmail,
      subject: 'OTP Verification',
      text: `Your OTP is: ${otp}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const sendContactMail = async (name, userMail, subject, message) => {
  try {
    console.log('hy',userMail);
    const mailOptions = {
      from: userMail,
      to: 'www.faizu9264@gmail.com',
      subject: subject,
      html: `<h4>Hi I'm ${name}</h4><br><p>${message}</p>`,
    };
  //  console.log(mailOptions);
    await transporter.sendMail(mailOptions); 
  } catch (error) {
    throw error;
  }
};

module.exports = { generateOtp, sendOtp, sendContactMail };
