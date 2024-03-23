import express from 'express';
import { averagePriceForProduct, getProductByOrderId, getProductBySupplier, getProductsByOfferId } from '../controllers/productsController.js';

const Router = express.Router();

Router.get('/supplier/:id',getProductBySupplier);
Router.get('/offer/:id',getProductsByOfferId)
Router.get('/order/:id',getProductByOrderId)
Router.get('/averagePrice/:id',averagePriceForProduct);

export default Router;