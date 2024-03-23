import express from 'express';
import { adminLogin, customerLogin, deliveryBoyLogin, supplierLogin } from '../auth/login.js';
import { createAdmin, createCustomer } from '../auth/signup.js';
import { customerProfile } from '../auth/userProfile.js';
import { sendResetCodeCustomer, resetPasswordCustomer } from '../auth/sendResetCode.js';
import validateEmail from '../middlewares/emailMiddleware.js';
import { authenticate } from '../middlewares/authorizationMiddleware.js';

const Router = express.Router();


Router.post('/supplier', validateEmail, supplierLogin);
Router.post('/customer', validateEmail, customerLogin);
Router.post('/deliveryBoy', validateEmail, deliveryBoyLogin);
Router.post('/admin', validateEmail, adminLogin);


Router.post('/signup/customer',validateEmail, createCustomer);
Router.get('/userProfile/customer', customerProfile);
Router.post('/sendResetCode/customer', validateEmail, sendResetCodeCustomer);
Router.post('/resetPassword/customer', validateEmail, resetPasswordCustomer);
Router.post('/signup/admin', validateEmail, createAdmin);

export default Router;