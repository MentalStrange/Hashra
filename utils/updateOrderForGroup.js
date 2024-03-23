// orderController.js

import Fee from "../models/feesSchema.js";
import Offer from "../models/offerSchema.js";
import Order from "../models/orderSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import mongoose from 'mongoose'

export const updateOrderForGroup = async (orderId, updateData,req) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
      return [];
    }
    if(mongoose.Types.ObjectId.isValid(updateData)){
      order.deliveryBoy = updateData;
      await order.save();
    }
    const supplier = await Supplier.findById(order.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    if (updateData === "completed") {
      const fee = await Fee.findOne();
      order.status = "complete";
      const blackHorseCommotion = order.totalPrice * (fee.amount / 100);
      supplier.wallet += blackHorseCommotion;
      await supplier.save();
      await order.save();
    } else if (updateData === "pending" || updateData === "complete") {
      order.status = "pending";
      await order.save();
    } else if (updateData === "delivery") {
      order.status = "delivery";
      await order.save();
    } else if (updateData === "inProgress") {
      order.status = "inProgress";
      await order.save();
    } else if (updateData === "willBeDelivered") {
      order.status = "willBeDelivered";
      await order.save();
    } else if (updateData === "trash") {
      order.status = "trash";
      await order.save();
    } else if (updateData === "canceled") {
      order.status = "canceled";
      await order.save();
      if (req.headers["user_type"] === "supplier") {
        supplier.wallet += 5;
        await supplier.save();
      }
      for (const product of order.products) {
        const supplierProduct = await SupplierProduct.findOne({
          supplierId: supplier._id,
          productId: product.product,
        });
        supplierProduct.stock += product.quantity;
        await supplierProduct.save();
      }
      for (const offer of order.offers) {
        const offerData = await Offer.findById(offer.offer);
        offerData.stock += offer.quantity;
        await offerData.save();
        for (const iterProduct of offerData.products) {
          const sp = await SupplierProduct.findOne({
            supplierId: supplier._id,
            productId: iterProduct.productId,
          });
          sp.stock += iterProduct.quantity * offer.quantity;
          await sp.save();
        }
      }
    }
    // Update the order with the provided data
    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });
    return updatedOrder;
  } catch (error) {
    // If an error occurs, throw it to the calling function
    throw error;
  }
};
