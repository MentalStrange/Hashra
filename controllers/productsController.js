import Product from "../models/productSchema.js";
import Supplier from "../models/supplierSchema.js";
import Category from "../models/categorySchema.js";
import Offer from "../models/offerSchema.js";
import Order from "../models/orderSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import fs from "fs";

import {
  transformationOrderProduct,
  transformationProduct,
  transformationSupplierProduct,
} from "../format/transformationObject.js";
import paginateResponse from "./../utils/paginationResponse.js";
import { searchProducts } from "../utils/search.js";

export const getProductBySupplier = async (req, res) => {
  const supplierId = req.params.id;
  const search = req.query.search;
  const sortDirection = req.query.price === '1' ? -1 : 1;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
    const supplierProductsCount = await SupplierProduct.countDocuments({
      supplierId,
    });
    const supplierProducts = await SupplierProduct.find({ supplierId }).sort({ price: sortDirection });
    if (!supplierProducts || supplierProducts.length === 0) {
      return res.status(200).json({
        status: "success",
        data:[],
        message: "No products found for this supplier",
      })
    }
    const products = await Promise.all(
      supplierProducts.map(async (supplierProduct) => {
        const transformedProduct = await transformationSupplierProduct(
          supplierProduct
        );
        return transformedProduct;
      })
    );
    const searchedProducts = searchProducts(products, search);    
    await paginateResponse(res, req.query, searchedProducts?await searchedProducts:products, supplierProductsCount);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getProductByCategory = async (req, res) => {
  const categoryId = req.params.id;
  const search = req.query.search;
  try {
    // Check if the category exists
    const category = await Category.findOne({ _id: categoryId });
    if (!category) {
      return res.status(404).json({
        status: "fail",
        message: "Category not found",
      });
    }
    const products = await Product.find({ category: categoryId });
    const productIds = products.map(product => product._id);
    const supplierProducts = await SupplierProduct.find({ productId: { $in: productIds } }).sort({createdAt: -1});
    const transformedProducts = await Promise.all(
      supplierProducts.map(async (supplierProduct) => {
        return await transformationSupplierProduct(supplierProduct);
      })
    );
    const searchedProducts = searchProducts(transformedProducts, search);
    await paginateResponse(res, req.query, searchedProducts ? await searchedProducts : transformedProducts, supplierProducts.length);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllProductAssignedToSupplier = async (req, res) => {
  const search = req.query.search || "";
  const sortDirection = req.query.price === '1' ? -1 : 1; // Check if price parameter is 1 for ascending or -1 for descending

  try {
    const supplierProducts = await SupplierProduct.find().sort({ price: sortDirection, createdAt: -1 });
    const supplierProductsCount = await SupplierProduct.countDocuments();
    const transformedProducts = await Promise.all(
      supplierProducts.map(async (supplierProduct) => {
        return await transformationSupplierProduct(supplierProduct);
      })
    );    
    const searchedProducts = searchProducts(transformedProducts, search);
    await paginateResponse(res, req.query, searchedProducts ? await searchedProducts : transformedProducts, supplierProductsCount);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllProduct = async (req, res) => {
  const search = req.query.search || "";
  try {
    let products = await Product.find();
    const totalProducts = await Product.countDocuments(products._conditions);
    if (products.length > 0) {
      const formattedProducts = await Promise.all(
        products.map((product) => transformationProduct(product))
      );
      const searchedProducts = searchProducts(formattedProducts, search);
      await paginateResponse(res, req.query, searchedProducts ? await searchedProducts : formattedProducts, totalProducts);
    } else {
      return res.status(200).json({
        status:"success",
        data:[],
        message:"No products found"
      })
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getProductsByOfferId = async (req, res) => {
  const offerId = req.params.id;
  
  try {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(200).json({
        status: "success",
        data:[],
        message: "Offer not found",
      })
    }
    let offerProducts = [];
    for (const prod of offer.products) {
      const sp = await SupplierProduct.findById(prod.productId).sort({createdAt: -1});
      offerProducts.push(await transformationSupplierProduct(sp, prod.quantity))
    }
    res.status(200).json({
      status: "success",
      data: offerProducts
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getProductByOrderId = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId).sort({createdAt: -1});
    // if (!order) {
    //   return res.status(200).json({
    //     status: "success",
    //     data: [],
    //     message: "Order not found",
    //   })
    // }
    // const supplierProducts = await SupplierProduct.find({
    //   productId: { $in: order.products.map((p) => p.product) },
    // })
    // const transformedProducts = await Promise.all(
    //   supplierProducts.map(async (supplierProduct) => {
    //     return await transformationSupplierProduct(supplierProduct);
    //   })
    // );
    res.status(200).json({
      status: "success",
      data: await transformationOrderProduct(order) //transformedProducts a,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const uploadProductImage = async (req, res) => {
  const productId = req.params.id;
  try{
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(207).json({
        status: "fail",
        message: "product not found"
      });
    }
    const imagePath = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    product.images = product.images.concat([imagePath]);
    await product.save();
    res.status(200).json({
      status: "success",
      data: await transformationProduct(product),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};
export const deleteProductImage = async (req, res) => {
  const productId = req.params.id;
  const productImage = req.body.image;
  try{
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(207).json({
        status: "fail",
        message: "product not found"
      });
    }

    const pathName = productImage.split('/').slice(3).join('/');
    fs.unlink('upload/' + pathName, (err) => {});
    product.images = product.images.filter(image => image !== productImage);
    await product.save();
    res.status(200).json({
      status: "success",
      data: await transformationProduct(product),
    });
   } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};
export const averagePriceForProduct = async (req, res) => {
  const productId = req.params.id;
  let gomlaAveragePrice = 0;
  let nosGomlaAveragePrice = 0;
  try {
    const supplierProducts = await SupplierProduct.find({ productId: productId });
    const NumberOfGomlaProduct = supplierProducts.filter(sp => sp.unit).length;
    const NumberOfNosGomlaProduct = supplierProducts.filter(sp => !sp.unit).length;
    for (const sp of supplierProducts) {
      if (sp.unit) {
        gomlaAveragePrice += sp.price
      } else {
        nosGomlaAveragePrice += sp.price
      }
    }
    res.status(200).json({
      status: "success",
      data: {
        gomlaAveragePrice: gomlaAveragePrice / NumberOfGomlaProduct,
        nosGomlaAveragePrice: nosGomlaAveragePrice / NumberOfNosGomlaProduct
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}