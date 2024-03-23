import Fee from "../models/feesSchema.js";
import Order from "../models/orderSchema.js";
import PromoCode from "../models/promocodeSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import Offer from "../models/offerSchema.js";
import Product from "../models/productSchema.js";
import {
  transformationCar,
  transformationOffer,
  transformationOrder,
  transformationOrderOffer,
  transformationSupplierProduct,
} from "../format/transformationObject.js";
import paginateResponse from "./../utils/paginationResponse.js";
import Car from "../models/carSchema.js";
import { pushNotification } from "../utils/pushNotification.js";
import Region from "../models/regionSchema.js";
import Customer from "../models/customerSchema.js";
import mongoose from 'mongoose'

export const getAllOrder = async (req, res) => {
  try {
    let orders;
    let query = {};
    if (req.query.date) {
      const orderDate = new Date(req.query.date);
      const nextDay = new Date(orderDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.orderDate = { $gte: orderDate, $lt: nextDay };
    } else if (req.query.month) {
      const year = new Date().getFullYear();
      const month = parseInt(req.query.month);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.orderDate = { $gte: startDate, $lte: endDate };
    }
    const totalOrders = await Order.countDocuments(query);
    orders = await Order.find(query).sort({ orderDate: -1 });

    // Transformation
    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        return await transformationOrder(order); // Transform each order
      })
    );

    // Pagination
    if (totalOrders === 0) {
      res.status(200).json({
        status: "success",
        message: "No orders found for the specified period",
        data: 0,
        totalOrders: totalOrders,
      });
    } else {
      paginateResponse(res, req.query, formattedOrders, totalOrders);
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const updateOrder = async (req, res, next) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }
    const supplier = await Supplier.findById(order.supplierId);
    if (!supplier) {
      return res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }

    if (req.body.status === "complete") {
      const customer = await Customer.findById(order.customerId);
      await pushNotification(
        "طلب شراء مكتمل",
        `تم استلام اوردر رقم ${order.orderNumber} بنجاح`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );
      const fee = await Fee.findOne({ type: "fee" });
      supplier.wallet += order.totalPrice * (fee.amount / 100);
      await supplier.save();
    } else if (req.body.status === "cancelled") {
      // not blackhorse
      const customer = await Customer.findById(order.customerId);
      await pushNotification(
        "الغاء اوردر!",
        `تم الغاء اوردرك برقم ${order.orderNumber}`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );
      if (
        req.headers["user_type"] === "supplier" &&
        order.status === "pending"
      ) {
        supplier.wallet += (
          await Fee.findOne({ type: "fineForCancel" })
        ).amount;
        await supplier.save();
      }
    } else if (req.body.status === "inProgress") {
      const customer = await Customer.findById(order.customerId);
      await pushNotification(
        "تم موافقة الطلب",
        `تم الموافقة علي طلب اوردر رقم ${order.orderNumber}`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );

      const products = order.products;
      const offers = order.offers;
      const productsMap = new Map();
      for (const product of products) {
        const supplierProduct = await SupplierProduct.findById(product.product);
        if (!supplierProduct || supplierProduct.stock < product.quantity) {
          // check quantity of products
          const prod = await Product.findById(supplierProduct.productId);
          return res.status(212).json({
            status: "fail",
            message: `Product with title ${prod.title} is not available or out of stock`,
          });
        }

        if (productsMap.has(product.product.toString())) {
          productsMap.set(
            product.product.toString(),
            productsMap.get(product.product.toString()) + product.quantity
          );
        } else {
          productsMap.set(product.product.toString(), product.quantity);
        }
      }

      for (const offer of offers) {
        const offerData = await Offer.findById(offer.offer); // offer quantity available in stock
        if (!offerData || offerData.stock < offer.quantity) {
          return res.status(214).json({
            status: "fail",
            message: `Offer with title ${offerData.title} is not available or out of stock`,
          });
        }

        for (const iterProduct of offerData.products) {
          // check products in offer available in stock
          const sp = await SupplierProduct.findById(iterProduct.productId);
          if (!sp || sp.stock < iterProduct.quantity) {
            const prod = await Product.findById(sp.productId);
            return res.status(216).json({
              status: "fail",
              message: `Product with title ${prod.title} in offer ${offerData.title} is not available or out of stock`,
            });
          }
          if (productsMap.has(iterProduct.productId.toString())) {
            productsMap.set(
              iterProduct.productId.toString(),
              productsMap.get(iterProduct.productId.toString()) +
                iterProduct.quantity * offer.quantity
            );
          } else {
            productsMap.set(
              iterProduct.productId.toString(),
              iterProduct.quantity * offer.quantity
            );
          }
        }
      }

      for (const [key, value] of productsMap.entries()) {
        // check total quantity of products available in supplier stock
        const supplierProduct = await SupplierProduct.findById(key);
        if (supplierProduct.stock < value) {
          const prod = await Product.findById(supplierProduct.productId);
          return res.status(217).json({
            status: "fail",
            message: `Product with title ${prod.title} is not available or out of stock`,
          });
        }
      }

      for (const product of products) {
        // decrement products
        const supplierProduct = await SupplierProduct.findById(product.product);
        supplierProduct.stock -= product.quantity;
        await supplierProduct.save();
      }

      for (const offer of offers) {
        // decrement offers
        const offerData = await Offer.findById(offer.offer);
        offerData.stock -= offer.quantity;
        await offerData.save();

        for (const iterProduct of offerData.products) {
          // decrement offer's product
          const sp = await SupplierProduct.findById(iterProduct.productId);
          sp.stock -= iterProduct.quantity * offer.quantity;
          await sp.save();
        }
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).sort({ orderDate: -1 });
    res.status(200).json({
      status: "success",
      data: await transformationOrder(updatedOrder),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOrderByDelivery = async (deliveryId) => {
  // use socketIO
  try {
    const orders = await Order.find({
      deliveryBoy: deliveryId,
      status: { $in: ["delivery", "willBeDelivered"] },
    }).sort({ orderDate: -1 });
    return await Promise.all(
      orders.map(async (order) => {
        return await transformationOrder(order);
      })
    );
  } catch (error) {
    return [];
  }
};
export const getOrderByDeliveryRoute = async (req, res) => {
  // use http
  const deliveryId = req.params.deliveryId;
  // const page = parseInt(req.query.page) || 1;
  // const limit = parseInt(req.query.limit) || 10;

  try {
    const totalOffers = await Order.countDocuments({
      deliveryBoy: deliveryId,
      status: "complete",
    });
    const orders = await Order.find({
      deliveryBoy: deliveryId,
      status: "complete",
    }).sort({ orderDate: -1 });
    const orderByDelivery = await Promise.all(
      orders.map(async (order) => {
        return await transformationOrder(order);
      })
    );
    // res.status(200).json({
    //   status: "success",
    //   data: orderByDelivery,
    // })
    paginateResponse(res, req.query, orderByDelivery, totalOffers);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createOrder = async (req, res) => {
  const orderData = req.body;
  const promoCode = req.body.promoCode;
  const customerId = req.body.customerId;
  const supplierId = req.body.supplierId;
  const products = req.body.products ?? []; // Array of products with { productId, quantity }
  const offers = req.body.offers ?? []; // Array of offers with { offerId, quantity }
  const carId = req.body.car;
  const totalPrice = req.body.totalPrice;
  const district = req.body.district;
  try {
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(205).json({
        status: "fail",
        message: "Car not found",
      });
    }

    if (district) {
      const region = await Region.findOne({ name: district });
      if (!region) {
        return res.status(218).json({
          status: "fail",
          message: "Region not found",
        });
      }
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(206).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
    if (!req.body.isGroup) {
      if (totalPrice < supplier.minOrderPrice) {
        return res.status(207).json({
          status: "fail",
          message: "Total price should be greater than min order price",
        });
      }
    }

    if (promoCode) {
      const existingPromoCode = await PromoCode.findOne({ code: promoCode });
      if (!existingPromoCode) {
        // check promo code exists
        return res.status(208).json({
          status: "fail",
          message: "Promo code not found",
        });
      }

      if (existingPromoCode.customerId.includes(customerId)) {
        // Check customer used promocode
        return res.status(209).json({
          status: "fail",
          message: "Promo code already used",
        });
      }

      if (existingPromoCode.numOfUsage <= 0) {
        // check number of usage
        return res.status(210).json({
          status: "fail",
          message: "The Promo code has reached its maximum usage limit.",
        });
      }

      const currentDate = new Date(); // check expiry date
      const newDate = new Date(currentDate.getTime() + 2 * 60 * 60 * 1000); // Adding 2 hours [Egypt]
      if (existingPromoCode.expiryDate < newDate) {
        return res.status(211).json({
          status: "fail",
          message: "The Promo code has expired.",
        });
      }
    }

    const productsMap = new Map();

    for (const product of products) {
      const supplierProduct = await SupplierProduct.findById(product.product);
      if (!supplierProduct || supplierProduct.stock < product.quantity) {
        // check quantity of products
        const prod = await Product.findById(supplierProduct.productId);
        return res.status(212).json({
          status: "fail",
          message: `Product with title ${prod.title} is not available or out of stock`,
        });
      }

      if (
        (!supplierProduct || supplierProduct.maxLimit < product.quantity) &&
        supplierProduct.maxLimit !== null
      ) {
        const prod = await Product.findById(supplierProduct.productId); // check products max limit
        return res.status(213).json({
          status: "fail",
          message: `The maximum quantity allowed for purchasing ${prod.title} is ${supplierProduct.maxLimit}`,
        });
      }
      if (productsMap.has(product.product.toString())) {
        productsMap.set(
          product.product.toString(),
          productsMap.get(product.product.toString()) + product.quantity
        );
      } else {
        productsMap.set(product.product.toString(), product.quantity);
      }
    }

    for (const offer of offers) {
      const offerData = await Offer.findById(offer.offer); // offer quantity available in stock
      if (!offerData || offerData.stock < offer.quantity) {
        return res.status(214).json({
          status: "fail",
          message: `Offer with title ${offerData.title} is not available or out of stock`,
        });
      }

      if (
        (!offerData || offerData.maxLimit < offer.quantity) &&
        offerData.maxLimit !== null
      ) {
        // check offer max limit
        return res.status(215).json({
          status: "fail",
          message: `The maximum quantity allowed for purchasing ${offerData.title} is ${offerData.maxLimit}`,
        });
      }

      for (const iterProduct of offerData.products) {
        // check products in offer available in stock
        const sp = await SupplierProduct.findById(iterProduct.productId);
        if (!sp || sp.stock < iterProduct.quantity) {
          const prod = await Product.findById(sp.productId);
          return res.status(216).json({
            status: "fail",
            message: `Product with title ${prod.title} in offer ${offerData.title} is not available or out of stock`,
          });
        }
        if (productsMap.has(iterProduct.productId.toString())) {
          productsMap.set(
            iterProduct.productId.toString(),
            productsMap.get(iterProduct.productId.toString()) +
              iterProduct.quantity * offer.quantity
          );
        } else {
          productsMap.set(
            iterProduct.productId.toString(),
            iterProduct.quantity * offer.quantity
          );
        }
      }
    }

    for (const [key, value] of productsMap.entries()) {
      // check total quantity of products available in supplier stock
      const supplierProduct = await SupplierProduct.findById(key);
      if (supplierProduct.stock < value) {
        const prod = await Product.findById(supplierProduct.productId);
        return res.status(217).json({
          status: "fail",
          message: `Product with title ${prod.title} is not available or out of stock`,
        });
      }
    }

    // console.log("productsMap:", productsMap);
    const newOrder = await Order.create({
      supplierId: orderData.supplierId,
      supplierName: supplier.name,
      supplierType: supplier.type,
      promoCode: orderData.promoCode ?? null,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerPhoneNumber: orderData.customerPhoneNumber,
      totalPrice: orderData.totalPrice,
      subTotalPrice: orderData.subTotalPrice,
      deliveryFees: orderData.deliveryFees,
      discount: orderData.discount,
      type: orderData.type,
      tax: orderData.tax,
      address: orderData.address ?? null,
      district: orderData.district ?? null,
      deliveryDaysNumber: orderData.deliveryDaysNumber,
      orderWeight: orderData.orderWeight,
      products: await Promise.all(
        orderData.products.map(async (product) => {
          const supplierProduct = await SupplierProduct.findById(
            product.product
          );
          const productData = await transformationSupplierProduct(
            supplierProduct
          );
          return {
            product: product.product,
            quantity: product.quantity,
            productWeight: product.productWeight,

            title: productData.title,
            price: productData.price,
            afterSale: productData.afterSale ?? null,
            images: productData.images ?? [],
            maxLimit: productData.maxLimit,
            supplierId: productData.supplierId,
            desc: productData.desc,
            weight: productData.weight,
            unit: productData.unit ?? null,
            subUnit: productData.subUnit,
            stock: productData.stock,
            numberOfSubUnit: productData.numberOfSubUnit ?? null,
            category: productData.category,
            supplierType: productData.supplierType,
          };
        })
      ),
      offers: await Promise.all(
        orderData.offers.map(async (offer) => {
          const offerObject = await Offer.findById(offer.offer);
          const offerData = await transformationOffer(
            offerObject,
            offer.quantity
          );
          return {
            offer: offer.offer,
            quantity: offer.quantity,
            offerWeight: offer.offerWeight,

            supplierId: offerData.supplierId,
            title: offerData.title,
            image: offerData.image ?? null,
            price: offerData.price,
            afterSale: offerData.afterSale ?? null,
            maxLimit: offerData.maxLimit ?? null,
            stock: offerData.stock,
            desc: offerData.desc,
            products: await Promise.all(
              offerData.products.map(async (product) => {
                const supplierProduct = await SupplierProduct.findById(
                  product.productId
                );
                const productData = await transformationSupplierProduct(
                  supplierProduct,
                  product.quantity
                );
                return {
                  product: productData._id,
                  title: productData.title,
                  price: productData.price,
                  afterSale: productData.afterSale ?? null,
                  images: productData.images ?? [],
                  maxLimit: productData.maxLimit,
                  supplierId: productData.supplierId,
                  desc: productData.desc,
                  unit: productData.unit ?? null,
                  subUnit: productData.subUnit,
                  stock: productData.stock,
                  numberOfSubUnit: productData.numberOfSubUnit ?? null,
                  category: productData.category,
                  supplierType: productData.supplierType,
                  quantity: productData.quantity,
                  weight: productData.weight,
                };
              })
            ),
          };
        })
      ),
      latitude: orderData.latitude ?? null,
      longitude: orderData.longitude ?? null,
      car: await (async () => {
        const carObject = await Car.findById(orderData.car);
        const carData = await transformationCar(carObject);
        return {
          car: carData._id,
          type: carData.type,
          maxWeight: carData.maxWeight,
          image: carData.image ?? null,
          number: carData.number,
        };
      })(),
    });
    if (promoCode) {
      const existingPromoCode = await PromoCode.findOne({ code: promoCode });
      existingPromoCode.numOfUsage--;
      existingPromoCode.customerId.push(customerId);
      await existingPromoCode.save();
    }
    await pushNotification(
      "لديك طلب جديد",
      "قام احد العملاء بطلب اوردر جديد ينتظر موافقتك",
      null,
      null,
      supplierId,
      null,
      supplier.deviceToken
    );
    res.status(201).json({
      status: "success",
      data: await transformationOrder(newOrder),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllOrderByCustomerId = async (req, res) => {
  const customerId = req.params.id;
  try {
    const ordersCount = await Order.countDocuments({ customerId });
    const orders = await Order.find({ customerId }).sort({ orderDate: -1 });
    if (orders) {
      const formattedOrders = await Promise.all(
        orders.map(async (order) => {
          return await transformationOrder(order); // Transform each order
        })
      );
      formattedOrders.reverse();
      const completeNotRatingOrder = formattedOrders.find(
        (order) =>
          order.status === "complete" && order.supplierRating === "notRating"
      );
      if (completeNotRatingOrder) {
        await Order.findOneAndUpdate(
          { _id: completeNotRatingOrder._id },
          { supplierRating: "ignore" },
          { new: true }
        );
      }
      paginateResponse(res, req.query, formattedOrders, ordersCount);
    } else {
      throw new Error("Could not find orders");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllOrderBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  // const orderMonth = req.query.month;
  // const startDate = new Date(new Date().getFullYear(), orderMonth - 1, 1); // First day of the month
  // const endDate = new Date(new Date().getFullYear(), orderMonth, 0); // Last day of the month
  const status = req.query.status;
  try {
    let orders;
    let totalOrders;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
    // const query = orderMonth
    //   ? {
    //       supplierId: supplierId,
    //       orderDate: { $gte: startDate, $lte: endDate },
    //     }
    //   : { supplierId: supplierId };
    // if (orderMonth) {
    //   orders = await Order.find(query).sort({ orderDate: -1 });
    //   totalOrders = await Order.countDocuments(query);
    //   if (orders.length === 0) {
    //     return res.status(200).json({
    //       status: "success",
    //       message: "No orders found for the specified month",
    //       data: 0,
    //       totalOrders: totalOrders,
    //     });
    //   }
    // } else
    if (status) {
      orders = await Order.find({
        supplierId: supplierId,
        status: status,
      }).sort({ orderDate: -1 });
      totalOrders = await Order.countDocuments({
        supplierId: supplierId,
        status: status,
      });
    } else {
      orders = await Order.find({ supplierId: supplierId }).sort({
        orderDate: -1,
      });
      totalOrders = await Order.countDocuments({ supplierId: supplierId });
    }

    // Transform orders
    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        return await transformationOrder(order); // Transform each order
      })
    );

    paginateResponse(res, req.query, formattedOrders, totalOrders);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const totalOrderBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  const month = req.query.month;

  try {
    let orders;
    if (
      month &&
      !isNaN(month) &&
      parseInt(month) >= 1 &&
      parseInt(month) <= 12
    ) {
      const startDate = new Date(
        new Date().getFullYear(),
        parseInt(month) - 1,
        1
      );
      const endDate = new Date(new Date().getFullYear(), parseInt(month), 0);
      orders = await Order.find({
        supplierId,
        orderDate: { $gte: startDate, $lte: endDate },
      });

      if (orders && orders.length > 0) {
        res.status(200).json({
          status: "success",
          data: orders.length,
        });
      } else {
        res.status(200).json({
          status: "success",
          data: orders.length,
        });
      }
    } else {
      orders = await Order.find({ supplierId });

      if (orders && orders.length > 0) {
        res.status(200).json({
          status: "success",
          data: orders.length,
        });
      } else {
        return res.status(200).json({
          status: "fail",
          message: "No orders found",
          data: 0,
        })
      }
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getBestSeller = async (req, res) => {
  try {
    const bestSellers = await Order.aggregate([
      { $match: { products: { $exists: true, $ne: [] } } }, // Filter out null or empty products array
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      {
        $lookup: {
          from: "products", // Assuming the name of the product collection is "products"
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
    ]);

    const productIds = bestSellers.map((seller) => seller._id);
    const products = await SupplierProduct.find({
      productId: { $in: productIds },
    });
    const formattedProducts = await Promise.all(
      products.map(async (product) => {
        return await transformationSupplierProduct(product);
      })
    );
    res.status(200).json({
      status: "success",
      data: formattedProducts,
    });
  } catch (error) {
    // If an error occurs, respond with a 500 status and error message
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const mostFrequentDistricts = async (req, res) => {
  try {
    const mostFrequentDistricts = await Order.aggregate([
      {
        $match: { status: "complete" },
      },
      {
        $group: {
          _id: "$district",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
    if (mostFrequentDistricts && mostFrequentDistricts.length > 0) {
      res.status(200).json({
        status: "success",
        data: mostFrequentDistricts,
      });
    } else {
      res.status(200).json({
        status: "success",
        message: "No delivered orders found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOffersByOrderId = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    res.status(200).json({
      status: "success",
      data: await transformationOrderOffer(order),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getBestSellerForSupplier = async (req, res) => {
  const supplierId = req.params.id;
  const { month } = req.query
  try {
    const firstDayOfMonth = new Date(new Date().getFullYear(), parseInt(month) - 1, 1);
    const lastDayOfMonth = new Date(new Date().getFullYear(), parseInt(month), 0, 23, 59, 59);        
    const bestSellers = await Order.aggregate([
      {
        $match: {
          supplierId: supplierId,
          products: { $exists: true, $ne: [] },
          orderDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        },
      }, // Filter orders by supplierId and month
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      {
        $lookup: {
          from: "products", // Assuming the name of the product collection is "products"
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
    ]); 
    const productIds = bestSellers.map((seller) => seller._id);
    const products = await SupplierProduct.find({
      productId: { $in: productIds },
      supplierId: supplierId,
    });
    const formattedProducts = await Promise.all(
      products.map(async (product) => {
        return await transformationSupplierProduct(product);
      })
    );
    res.status(200).json({
      status: "success",
      data: formattedProducts,
    });
  } catch (error) {
    // If an error occurs, respond with a 500 status and error message
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

