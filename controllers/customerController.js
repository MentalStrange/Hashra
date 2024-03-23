import Category from "../models/categorySchema.js"
import Order from "../models/orderSchema.js";
import Customer from "../models/customerSchema.js";
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import {transformationCustomer} from "../format/transformationObject.js";

export const getCustomerById = async (req, res) => {
  const customerId = req.params.id;
  try {
    const customer= await Customer.findOne({_id: customerId});
    if(!customer){
      return res.status(207).json({
        status:"fail",
        message:"Customer not found"
      })
    }

    return res.status(200).json({
      status: "success",
      data: transformationCustomer(customer),
    });
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    });
  }
}

export const updateCustomer = async (req, res) => {
  const customerId = req.params.id;

  try {
    const customer= await Customer.findOne({_id: customerId});
    if(!customer){
      return res.status(207).json({
        status:"fail",
        message:"Customer not found"
      })
    }

    const customerData = req.body;
    if (customerData.name !== undefined) {
      customer.name = customerData.name;
    }
    if (customerData.phone !== undefined) {
      customer.phone = customerData.phone;
    }
    if (customerData.address !== undefined) {
      customer.address = customerData.address;
    }
    if (customerData.district !== undefined) {
      customer.district = customerData.district;
    }
    if (customerData.governorate !== undefined) {
      customer.governorate = customerData.governorate;
    }
    if (customerData.status !== undefined) {
      customer.status = customerData.status;
    }
    await customer.save();
    return res.status(200).json({
      status: "success",
      data: await transformationCustomer(customer),
      message: req.headers['language'] === 'en' ? "Customer data updated successfully" : "تم تعديل بيانات العميل بنجاح"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}

/************************************ UploadPhoto Customer ************************************/
export const uploadPhoto = async (req, res) => {
  const customerId = req.params.id;  
  try {
    const customer = await Customer.findOne({ _id: customerId });
    if (!customer) {
      return res.status(207).json({
        status: "fail",
        message: "Customer not found"
      });
    }
    const pathName = customer.image.split('/').slice(3).join('/');
    fs.unlink('upload/' + pathName, (err) => {});
    customer.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await customer.save();
    return res.status(200).json({
      status: "success",
      data: await transformationCustomer(customer),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}
export const getNumberOfCustomer = async (req, res) => {
  try {
    const customer = await Customer.countDocuments();
    return res.status(200).json({
      status: "success",
      data: customer
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}
