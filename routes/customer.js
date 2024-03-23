import express from 'express';
import {
    updateCustomer,
    uploadPhoto,
    getCustomerById
} from '../controllers/customerController.js';
import {  getAllProductAssignedToSupplier, getProductByCategory } from '../controllers/productsController.js';
import {  getAllHomeSlideShow } from '../controllers/adminController.js';
import {createOrder, getAllOrderByCustomerId, getBestSeller, getOffersByOrderId, updateOrder} from '../controllers/orderController.js';
import { applyPromoCode } from '../controllers/promoCodeController.js';
import { createRating } from '../controllers/ratingController.js';
import { authenticate } from "../middlewares/authorizationMiddleware.js";
import { getAllSupplier } from '../controllers/supplierController.js';
import { createGroup, getAllGroupForCustomer, getAllGroupPending, joinGroup } from '../controllers/groupController.js';
import { storage } from '../controllers/sharedFunction.js';
import multer from 'multer';
import { getOfferByOrderId } from '../controllers/offerController.js';
import { deleteNotification, getNotificationsByCustomerId, getNotificationsByDeliveryId, getNotificationsBySupplierId } from '../controllers/notificationController.js';
import { getAllCategory } from '../controllers/categoryController.js';

const uploadCustomer = multer({ storage: storage('customer') });

const Router = express.Router();

Router.get('/category',getAllCategory);
Router.get('/product/category/:id',getProductByCategory);
Router.get('/product',getAllProductAssignedToSupplier);

Router.get('/homeSlideShow',getAllHomeSlideShow);

Router.get('/getCustomerById/:id', authenticate, getCustomerById);
Router.patch("/:id", updateCustomer);

Router.post("/createRating", createRating);  // used by customer&supplier

Router.post("/order", createOrder);
Router.patch("/order/:id", updateOrder);
Router.get('/order/bestSeller',getBestSeller);
Router.get("/order/:id", getAllOrderByCustomerId);
Router.get("/order/getOffersByOrderId/:id", getOffersByOrderId);

Router.patch("/uploadPhoto/:id", uploadCustomer.single("image"), uploadPhoto);

Router.post("/promoCode",applyPromoCode)

Router.get('/supplier',authenticate, getAllSupplier)

Router.get('/group',getAllGroupPending);
Router.post('/group',createGroup);
Router.patch('/group/:id', joinGroup);

Router.get('/offer/order/:id', getOfferByOrderId)

Router.get('/getNotificationsByCustomerId/:id', getNotificationsByCustomerId);
Router.get('/getNotificationsBySupplierId/:id', getNotificationsBySupplierId);
Router.get('/getNotificationsByDeliveryId/:id', getNotificationsByDeliveryId);
Router.delete('/deleteNotification/:id', deleteNotification);

export default Router;