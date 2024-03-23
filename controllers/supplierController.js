import mongoose from "mongoose";
import Supplier from "./../models/supplierSchema.js";
import Order from "./../models/orderSchema.js";
import Product from "../models/productSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import {
  transformationOrder,
  transformationRegion,
  transformationSupplier,
  transformationSupplierProduct,
} from "../format/transformationObject.js";
import paginateResponse from "../utils/paginationResponse.js";
import Unit from "../models/unitSchema.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import Region from "../models/regionSchema.js";
import Offer from "../models/offerSchema.js";

export const getAllSupplier = async (req, res) => {
  try {
    const type = req.query.type; 
    let filter = {status:"active"}; 
    if (type) {
      filter.type = type;
    }
    const isAdmin = req.headers["type"] === "admin";
    if(isAdmin){
      filter = {};
      if (type) {
        filter.type = type;
      }
    }
    const suppliers = await Supplier.find(filter); 
    const supplierTransformation = await Promise.all(
      suppliers.map(async (supplier) => transformationSupplier(supplier, isAdmin))
    );
    res.status(200).json({
      status: "success",
      data: supplierTransformation,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getSupplier = async (req, res) => {
  const id = req.params.id;
  try {
    const supplier = await Supplier.findById(id);
    if (supplier) {
      res.status(200).json({
        status: "success",
        data: await transformationSupplier(supplier),
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const updateSupplier = async (req, res) => {
  let supplierId = req.params.id.trim();
  const supplierData = req.body;
  try {
    // Validate supplierId
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid supplierId format",
      });
    }
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      supplierId,
      supplierData,
      { new: true }
    );
    if (updatedSupplier) {
      // Check if any required fields are empty or missing
      let status = "active"; // Assume status is active by default
      Object.entries(updatedSupplier.toObject()).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length === 0) {
          status = "inactive";
        } else if (typeof value === "string" && value.trim() === "") {
          status = "inactive";
        } else if (typeof value === "number" && isNaN(value)) {
          status = "inactive";
        }
      });
      // Update the status of the supplier
      updatedSupplier.status = status;
      await updatedSupplier.save();
      if (updatedSupplier.type === "blackHorse") {
        res.status(200).json({
          status: "success",
          data: {
            ...(await transformationSupplier(updatedSupplier)),
            access_token: jwt.sign(
              { _id: updatedSupplier._id, role: "blackHorse" },
              process.env.JWT_SECRET,
              {}
            ),
          },
        });
      } else {
        res.status(200).json({
          status: "success",
          data: {
            ...(await transformationSupplier(updatedSupplier)),
            access_token: jwt.sign(
              { _id: updatedSupplier._id, role: req.role },
              process.env.JWT_SECRET,
              {}
            ),
          },
        });
      }
    } else {
      res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createProductSupplier = async (req, res) => {
  const supplierId = req.body.supplierId;
  const productId = req.body.productId;
  const productData = req.body;
  const unitId = req.body.unit;
  // const role = req.role;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(206).json({
        status: "fail",
        message: "Product not found",
      });
    }
    const unit = await Unit.findById(unitId);
    let unitWeight = product.weight;
    if (unit) {
      unitWeight *= unit.maxNumber;
    }
    const supplier = await Supplier.findById(supplierId);
    if (supplier.status === "inactive") {
      return res.status(401).json({
        status: "fail",
        message: "Supplier is inactive",
      });
    }
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier not found",
      });
    }

    const oldSupplierProduct = await SupplierProduct.find({
      productId: productId,
      supplierId: supplierId,
    });

    if (oldSupplierProduct.length > 0) {
      for (const sp of oldSupplierProduct) {
        if (!unit && !sp.unit && sp.subUnit) {
          return res.status(211).json({
            status: "fail",
            message: "Product already exists in supplier list with sub unit",
          });
        } else if (unit && sp.unit) {
          return res.status(212).json({
            status: "fail",
            message:
              "Product already exists in supplier list with primary unit",
          });
        }
      }
    }

    // this check will only apply when add authentication.
    // if(role === "gomlaGomla" || role === "compony" && req.subUnit != null){
    //   return res.status(400).json({
    //     status:"fail",
    //     message:"You should sell By Unit only"
    //   })
    // }
    const newSupplierProduct = await SupplierProduct.create({
      productWeight: unitWeight,
      supplierId,
      productId,
      ...productData,
    });
    res.status(200).json({
      status: "success",
      data: await transformationSupplierProduct(newSupplierProduct),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail here",
      message: error.message,
    });
  }
};
export const updateProductSupplier = async (req, res) => {
  const productId = req.params.id;
  const productData = req.body;

  try {
    // const ordersPending = await Order.find({ supplierId: supplierId, status: 'pending' });
    // const productIncluded = ordersPending.some(order => {
    //   return order.products.some(orderProduct => orderProduct.product.equals(productId));
    // });
    // if (productIncluded) {
    //   return res.status(207).json({
    //     status: 'fail',
    //     message: 'This product is already included in order',
    //   });
    // }

    const supplierProductId = await SupplierProduct.findById(productId);
    if (supplierProductId) {
      const updatedSupplierProduct = await SupplierProduct.findByIdAndUpdate(
        supplierProductId._id,
        productData,
        { new: true }
      );
      res.status(200).json({
        status: "success",
        data: await transformationSupplierProduct(updatedSupplierProduct),
      });
    } else {
      throw new Error("Product not found");
    }
  } catch (error) {
    res.status(error.statusCode || 404).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const deleteProductSupplier = async (req, res) => {
  const productId = req.params.id;
  try {
    const ordersPending = await Order.find({
      status: {
        $in: ["pending", "inProgress", "delivery", "willBeDelivered", "trash"],
      },
    }).sort({ createdAt: -1 });
    const productIncluded1 = ordersPending.some((order) => {
      return order.products.some((orderProduct) =>
        orderProduct.product.equals(productId)
      );
    });
    if (productIncluded1) {
      return res.status(207).json({
        status: "fail",
        message: "This product is already included in order",
      });
    }

    const offers = await Offer.find();
    const productIncluded2 = offers.some((offer) => {
      return offer.products.some((productProduct) =>
        productProduct.productId.equals(productId)
      );
    });
    if (productIncluded2) {
      return res.status(208).json({
        status: "fail",
        message: "This product is already included in offer",
      });
    }

    const supplierProductId = await SupplierProduct.findById(productId);
    if (supplierProductId) {
      supplierProductId.status = "inactive";
      await supplierProductId.save();
      res.status(200).json({
        status: "success",
        message: "Product deleted successfully.",
      });
    } else {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }
  } catch (error) {
    res.status(error.statusCode || 404).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const totalSalesBySupplierId = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplier = await Supplier.findById(supplierId);
    let monthSales = req.query.month ? parseInt(req.query.month) : null;
    let query = { supplierId };
    const { date } = req.query; // Added to extract date query parameter
    if (!supplier) {
      return res
        .status(404)
        .json({ status: "fail", message: "Supplier not found." });
    }
    if (
      monthSales &&
      !isNaN(monthSales) &&
      monthSales >= 1 &&
      monthSales <= 12
    ) {
      // Create date range for the specified month
      const startDate = new Date(new Date().getFullYear(), monthSales - 1, 1); // First day of the month
      const endDate = new Date(new Date().getFullYear(), monthSales, 0); // Last day of the month
      query.orderDate = { $gte: startDate, $lte: endDate };
    } else if (date) {
      // If date is provided, filter orders for that specific date
      const orderDate = new Date(date);
      const nextDay = new Date(orderDate);
      nextDay.setDate(nextDay.getDate() + 1); // End of the provided date
      query.orderDate = { $gte: orderDate, $lt: nextDay };
    }
    const orders = await Order.find(query);
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.status(200).json({ status: "success", data: totalSales });
  } catch (error) {
    console.error("Error in totalSales function:", error);
    res.status(500).json({ status: "fail", message: "Internal server error." });
  }
};
export const getTotalSales = async (req, res) => {
  try {
    let monthSales = req.query.month ? parseInt(req.query.month) : null;
    let query = {};
    const { date } = req.query; // Added to extract date query parameter
    if (
      monthSales &&
      !isNaN(monthSales) &&
      monthSales >= 1 &&
      monthSales <= 12
    ) {
      // Create date range for the specified month
      const startDate = new Date(new Date().getFullYear(), monthSales - 1, 1); // First day of the month
      const endDate = new Date(new Date().getFullYear(), monthSales, 0); // Last day of the month
      query.orderDate = { $gte: startDate, $lte: endDate };
    } else if (date) {
      // If date is provided, filter orders for that specific date
      const orderDate = new Date(date);
      const nextDay = new Date(orderDate);
      nextDay.setDate(nextDay.getDate() + 1); // End of the provided date
      query.orderDate = { $gte: orderDate, $lt: nextDay };
    }
    const orders = await Order.find(query);
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.status(200).json({ status: "success", data: totalSales });
  } catch (error) {
    console.error("Error in totalSales function:", error);
    res.status(500).json({ status: "fail", message: "Internal server error." });
  }
};
export const getOrdersForSupplierInCurrentMonth = async (req, res) => {
  const supplierId = req.params.id;
  const startOfMonth = new Date();
  startOfMonth.setDate(1); // Set to the 1st day of the current month
  startOfMonth.setHours(0, 0, 0, 0); // Set time to midnight

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1); // Move to the next month
  endOfMonth.setDate(0); // Set to the last day of the current month
  endOfMonth.setHours(23, 59, 59, 999); // Set time to end of day

  try {
    const orders = await Order.find({
      supplierId,
      orderDate: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.status(200).json({
      status: "success",
      data: totalSales,
    });
  } catch (error) {
    throw new Error("Error fetching orders for supplier: " + error.message);
  }
};
export const lastOrdersBySupplierId = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        status: "fail",
        message: "Supplier Not Found",
      });
    }
    const totalOrdersCount = await Order.countDocuments({ supplierId });
    const lastOrders = await Order.find({ supplierId }).sort({ createdAt: -1 });
    if (lastOrders && lastOrders.length > 0) {
      const formattedOrders = await Promise.all(
        lastOrders.map(async (order) => {
          return await transformationOrder(order); // Transform each order
        })
      );
      paginateResponse(res, req.query, formattedOrders, totalOrdersCount); // Apply pagination to transformed orders
    } else {
      res.status(200).json({
        status: "fail",
        data: [],
        message: "No Orders Found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const uploadPhoto = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier not found",
      });
    }

    const pathName = supplier.image.split("/").slice(3).join("/");
    fs.unlink("upload/" + pathName, (err) => {});
    supplier.image = `${process.env.SERVER_URL}${req.file.path
      .replace(/\\/g, "/")
      .replace(/^upload\//, "")}`;
    await supplier.save();
    return res.status(200).json({
      status: "success",
      data: supplier.image,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
export const uploadPlaceImages = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier not found",
      });
    }

    const imagePaths = req.files.map(
      (file) =>
        `${process.env.SERVER_URL}${file.path
          .replace(/\\/g, "/")
          .replace(/^upload\//, "")}`
    );
    supplier.placeImage = supplier.placeImage.concat(imagePaths);
    await supplier.save();
    res.status(200).json({
      status: "success",
      data: supplier.placeImage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
export const deletePlaceImages = async (req, res) => {
  const supplierId = req.params.id;
  const placeImage = req.body.placeImage;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier not found",
      });
    }

    const pathName = placeImage.split("/").slice(3).join("/");
    fs.unlink("upload/" + pathName, (err) => {});
    supplier.placeImage = supplier.placeImage.filter(
      (image) => image !== placeImage
    );
    await supplier.save();
    res.status(200).json({
      status: "success",
      data: supplier.placeImage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
export const getRegionBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
    const regions = await Promise.all(
      supplier.deliveryRegion.map(async (supplierRegion) => {
        const region = await Region.findById(supplierRegion);
        return await transformationRegion(region);
      })
    );
    res.status(200).json({
      status: "success",
      data: regions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
