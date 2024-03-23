import { transformationOffer } from "../format/transformationObject.js";
import Offer from "../models/offerSchema.js"
import Order from "../models/orderSchema.js";
import Product from "../models/productSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import fs from "fs";
import { pushNotification } from "../utils/pushNotification.js";
import Customer from "../models/customerSchema.js";
import Notification from "../models/notificationSchema.js";

export const getAllOffer = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default page number is 1
  const limit = parseInt(req.query.limit) || 10; // Default limit is 10 offers per page

  try {
    const totalOffers = await Offer.countDocuments();
    const totalPages = Math.ceil(totalOffers / limit);
    const skip = (page - 1) * limit;

    const offers = await Offer.find().skip(skip).limit(limit).sort({ createdAt: -1 });

    if (offers.length > 0) {
      const transformedOffers = await Promise.all(offers.map(async (offer) => {
        return await transformationOffer(offer); // Transform each offer
      }));

      res.status(200).json({
        status: "success",
        data: transformedOffers,
        totalPages: totalPages,
        currentPage: page
      });
    } else {
      res.status(200).json({
        status: "success",
        data: [],
        totalPages: totalPages,
        currentPage: page
      });
      // throw new Error('Could not find offers');
    }
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
export const getOffer = async (req, res) => {
  const offerId = req.params.id;
  try {
    const offer = await Offer.findById(offerId);
    
    if (offer) {
      const transformedOffer = await transformationOffer(offer);
      
      res.status(200).json({
        status: "success",
        data: transformedOffer
      });
    } else {
      throw new Error('Could not find offer');
    }
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
export const updateOffer = async (req, res) => {
  const offerId = req.params.id;
  const products = req.body.products;
  try {
    await Promise.all(products.map(async (product) => {
      const supplierProduct = await SupplierProduct.findById(product.productId);
      if(!supplierProduct){
        return res.status(404).json({
          status:'fail',
          message:`Product ${product.productId} Not Found`
        })
      }}))
 
    const offer = await Offer.findById(offerId);
    if(products){
      const ordersPending = await Order.find({ supplierId: offer.supplierId, status: { $in: ['pending', 'inProgress', 'delivery', 'willBeDelivered', 'trash'] } }).sort({ createdAt: -1 });
      const offerIncluded = ordersPending.some(order => {
        return order.offers.some(orderOffer => orderOffer.offer.equals(offerId));
      });
      if (offerIncluded) {
        return res.status(207).json({
          status: 'fail',
          message: 'This offer is already included in order',
        });
      }  
    }

    let offerWeight = 0;
    const offerUpdated = await Offer.findByIdAndUpdate(offerId, req.body, { new: true });
    for(const productOffer of offerUpdated.products) {
      const supplierProduct = await SupplierProduct.findById(productOffer.productId);
      offerWeight += supplierProduct.productWeight * productOffer.quantity;
    }
    offer.weight = offerWeight;
    await offer.save();

    res.status(200).json({
      status: 'success',
      data: await transformationOffer(offerUpdated),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const deleteOffer = async (req, res) => {
  const offerId = req.params.id;
  try {
    if(offerId){
      const offer = await Offer.findById(offerId);
      const ordersPending = await Order.find({ supplierId: offer.supplierId, status: { $in: ['pending', 'inProgress', 'delivery', 'willBeDelivered', 'trash'] } }).sort({ createdAt: -1 });

      const offerIncluded = ordersPending.some(order => {
        return order.offers.some(orderOffer => orderOffer.offer.equals(offerId));
      });
      if (offerIncluded) {
        return res.status(207).json({
          status: 'fail',
          message: 'This offer is already included in order',
        });
      }

      await Offer.findByIdAndDelete(offerId);
      offer.image = offer.image ?? "";
      const pathName = offer.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
      await Offer.findByIdAndDelete(offerId);
      res.status(200).json({
        status:"success",
        data:null
      })
    }else{
      throw new Error("Can not found this offer");
    }
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}

export const createOffer = async (req, res) => {
  const offerData = req.body;
  const supplierId = req.body.supplierId;
  const productIds = req.body.products; // Array of product IDs
  const offerTitle = req.body.title
  try {
    const offer = await Offer.findOne({title:offerTitle});
    if(offer){
      return res.status(400).json({
        status:"fail",
        message:"offer already exist"
      })
    }
    const supplier = await Supplier.findById(supplierId);
    if(!supplier){
      return res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      })
    }
    if (!offerData) {
      throw new Error(`Offer data is required`);
    }
    if (!supplierId) {
      throw new Error(`Supplier ID is required`);
    }
    if (!productIds || productIds.length === 0) {
      throw new Error(`Product IDs are required`);
    }
    const existingOffer = await Offer.findOne({ supplierId, productId: { $all: productIds } });
    if (existingOffer) {
      return res.status(400).json({
        status: "fail",
        message: "An offer for the same products by the same supplier already exists",
      });
    }
  
    const newOffer = new Offer(offerData);
    await newOffer.save();
    const customersDeviceToken = await Customer.find({}, 'deviceToken');
    const deviceTokens = customersDeviceToken.map(customer => customer.deviceToken);
    await Notification.deleteMany({ type: 'addNewOffer' });
    await pushNotification("عرض جديد متاح!", "استكشف أحدث عروضنا التي تمت إضافتها للتو. لا تفوت هذا العرض الخاص.", "addNewOffer", null, null, null, deviceTokens);
    res.status(201).json({
      status: "success",
      data: await transformationOffer(newOffer),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const changeImageOffer = async (req, res) => {
  const offerId = req.params.id;
  try{
    const offer = await Offer.findById(offerId);
    if(!offer){
      return res.status(404).json({
        status: "fail",
        message: "Offer not found",
      })
    }
    offer.image = offer.image ?? "";
    const pathName = offer.image.split('/').slice(3).join('/');
    fs.unlink('upload/' + pathName, (err) => {});
    offer.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await offer.save();
    res.status(201).json({
      status: "success",
      data: await transformationOffer(offer),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export const getOfferBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if(!supplier || supplier.status === 'inactive'){
      return res.status(200).json({
        status: "fail",
        data:[],
        message: "Supplier not found",
      })
    }
    const offers = await Offer.find({ supplierId }).sort({ createdAt: -1 });
    if (offers && offers.length > 0) {
      const transformedOffers = await Promise.all(offers.map(async (offer) => {
        return await transformationOffer(offer);
      }));
      res.status(200).json({
        status: "success",
        data: transformedOffers
      });
    } else {
      return res.status(200).json({
        status: "fail",
        data:[],
        message: "No offers found"
      })
    }
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

export const getOfferByOrderId = async (req, res) => {
  const orderId = req.params.id;
  try {
    const orders = await Order.findOne({ _id: orderId });
    if (orders && orders.offers && orders.offers.length > 0) { // Check if offers array is not empty
      const transformedOffers = await Promise.all(orders.offers.map(async (offerId) => {
        const offer = await Offer.findById(offerId.offer);
        return await transformationOffer(offer);
      }));
      res.status(200).json({
        status: "success",
        data: transformedOffers
      });
    } else {
      return res.status(404).json({
        status: "fail",
        data:[],
        message: "No offers found"
      })
    }
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
