import Order from "../models/orderSchema.js"
import SupplierProduct from "../models/supplierProductSchema.js";

export const rateOfStatistics = async (req, res) => {
  const supplierId = req.params.id;
  const { startDate, endDate } = req.query;
  try {
    let filter = { supplierId: supplierId };
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const totalOrdersCancelled = await Order.countDocuments(filter);
    const orderCancelled = await Order.countDocuments({ status: "cancelled", ...filter });

    const totalProducts = await SupplierProduct.countDocuments(filter);
    const productRemoved = await SupplierProduct.countDocuments({ status: "inActive", ...filter });

    const totalOrdersTrashed = await Order.countDocuments(filter);
    const orderTrash = await Order.countDocuments({ status: "trash", ...filter });

    const totalCompletedOrders = await Order.countDocuments({ status: "complete", ...filter });
    const totalOrders = await Order.countDocuments(filter);

    const completedRate = totalOrders === 0 ? 0 : (totalCompletedOrders / totalOrders) * 100;
    const cancellationRate = totalOrdersCancelled === 0 ? 0 : (orderCancelled / totalOrdersCancelled) * 100;
    const trashRate = totalOrdersTrashed === 0 ? 0 : (orderTrash / totalOrdersTrashed) * 100;
    const removalRate = totalProducts === 0 ? 0 : (productRemoved / totalProducts) * 100;

    
    res.status(200).json({
      status: "success",
      data: {
        cancellationRate,
        trashRate,
        removalRate,
        completedRate
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};


