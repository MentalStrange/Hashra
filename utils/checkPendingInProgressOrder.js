import Fee from "../models/feesSchema.js";
import Offer from "../models/offerSchema.js";
import Order from "../models/orderSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import { pushNotification } from "./pushNotification.js";

export const checkPendingOrder = async () => {  
  try {
      const orders = await Order.find({ status: 'pending' });
      const fine = await Fee.findOne({ type: "numberOfPendingDaysOrder" });
      const fineAmount = roundUpToSeven(fine.amount);
      const fineTrash = await Fee.findOne({ type: "fineForTrash" });
      const fineTrashAmount = fineTrash.amount;
      
      for (const order of orders) {
        const currentDate = new Date();
        const orderDate = new Date(order.orderDate);
        const differenceInDays = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));

        if (differenceInDays > fineAmount) {
          order.status = 'trash';
          await order.save();

          const supplier = await Supplier.findById(order.supplierId);
          supplier.wallet += fineTrashAmount;
          await supplier.save();
          await pushNotification("اوردر مهمل", "تم تغير حالة اورد خاص بك من قيد الانتظار الي المهملة", null, null, supplier._id, null, supplier.deviceToken);
        }
      }
      
  //   const currentDate = new Date();
  //   currentDate.setHours(currentDate.getHours() + 2); // Adjust to your timezone

  //   for (const order of orders) {
  //     const orderDate = new Date(order.orderDate);
  //     const differenceInDays = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));

  //     // Check for expired orders based on fine amount
  //     if (differenceInDays > fineAmount) {
  //       order.status = 'trash';
  //       await order.save();
  //       console.log(`Order ${order._id} status updated to 'trash' (expired)`);
  //       continue; // Skip further processing for this order
  //     }

  //     // Calculate business days considering supplier working days
  //     let businessDays = 0;
  //     for (let checkDate = new Date(orderDate); checkDate <= currentDate; checkDate.setDate(checkDate.getDate() + 1)) {
  //       const dayName = checkDate.getDay().toString().toLowerCase(); // More robust day name handling
  //       const supplier = await Supplier.findById(order.supplierId);
  //       if (supplier.workingDays.includes(dayName)) {
  //         businessDays++;
  //       }
  //     }

  //     // Check if order age exceeds allowed business days
  //     if (businessDays > fineAmount) {
  //       order.status = 'trash';
  //       await order.save();
  //       console.log(`Order ${order._id} status updated to 'trash' (exceeds allowed business days)`);
  //     }
  //   }

  } catch (error) {
    console.error("Error while checking pending orders:", error);
  }
};

export const checkInProgressOrder = async () => {  
  try {
    const orders = await Order.find({ status: 'inProgress' });
    const fineTrash = await Fee.findOne({ type: "fineForTrash" });
    const fineTrashAmount = fineTrash.amount;
    
    for (const order of orders) {
      const supplier = await Supplier.findById(order.supplierId);
      const deliveryDaysNumber = roundUpToSeven(supplier.deliveryDaysNumber);
      console.log(supplier.deliveryDaysNumber)
      const currentDate = new Date();
      const updatedAt = new Date(order.updatedAt);
      const differenceInDays = Math.floor((currentDate - updatedAt) / (1000 * 60 * 60 * 24));
      console.log(differenceInDays);
      if (differenceInDays > deliveryDaysNumber) {
        order.status = 'trash';
        await order.save();
        console.log("in");
        supplier.wallet += fineTrashAmount;
        await supplier.save();
        await pushNotification("اوردر مهمل", "تم تغير حالة اورد خاص بك من قيد الانتظار الي المهملة", null, null, supplier._id, null, supplier.deviceToken);
    
        for (const product of order.products) {
          const sp = await SupplierProduct.findById(product.product);
          sp.stock += product.quantity;
          await sp.save();
        }

        for (const offer of order.offers) {
          const offerData = await Offer.findById(offer.offer);
          offerData.stock += offer.quantity;
          await offerData.save();

          for (const iterProduct of offerData.products) {
            const sp = await SupplierProduct.findById(iterProduct.productId);
            sp.stock += iterProduct.quantity * offer.quantity;
            await sp.save();
          }
        }
      }
    }
  } catch (error) {
    console.error("Error while checking pending orders:", error);
  }
};
  
function roundUpToSeven(number) {
  const quotient = Math.floor(number / 7);    
  if (number % 7 === 0) {
    return quotient * 7;
  } else {
    return (quotient + 1) * 7;
  }
}