import Customer from "../models/customerSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Supplier from "../models/supplierSchema.js";
import {transformationAdmin, transformationCustomer, transformationDeliveryBoy, transformationSupplier} from "../format/transformationObject.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import Admin from "../models/adminSchema.js";
const salt = 10 ;

export const customerLogin = async (req, res) => {
  const customerEmail = req.body.email;
  const customerPassword = req.body.password;
  const deviceToken = req.body.deviceToken;

  try {
    const customer = await Customer.findOne({ email: customerEmail.toLowerCase() });
    if (!customer) {
      return res.status(203).json({ // email not found
        status: "fail",
        message: req.headers['language'] === 'en' ? "Verify your emil or password" : "قم من التحقق من البريد الإلكتروني أو كلمة المرور",
      });
    }
    const isPasswordMatch = await bcrypt.compare(
        customerPassword,
        customer.password
    );
    if (!isPasswordMatch) {
      return res.status(203).json({ // password incorrect
        status: "fail",
        message: req.headers['language'] === 'en' ? "Verify your email or password" : "قم من التحقق من البريد الإلكتروني أو كلمة المرور",
      });
    }
    customer.deviceToken = deviceToken;
    await customer.save();
    res.status(200).json({
      status: "success",
      data: {...(await transformationCustomer(customer)), access_token: jwt.sign({_id: customer._id, role: "customer"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const supplierLogin = async (req, res) => {
  const supplierEmail = req.body.email;
  const supplierPassword = req.body.password;
  const deviceToken = req.body.deviceToken;
  try {
    const supplier = await Supplier.findOne({ email: supplierEmail.toLowerCase() });    
    if (supplier.length === 0) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier Not Found",
      });
    }
    const isPasswordMatch = await bcrypt.compare(
      supplierPassword,
      supplier.password
    );
    if (!isPasswordMatch) {
      return res.status(207).json({
        status: "fail",
        message: "Password Not Correct",
      });
    }
    const { password, ...rest } = supplier ;
    supplier.deviceToken = deviceToken;
    await supplier.save();
    if(rest.type === "blackHorse"){
      res.status(200).json({
        status: "success",
        data: {...(await transformationSupplier(supplier)), access_token: jwt.sign({_id: rest._id, role: "blackHorse"}, process.env.JWT_SECRET, {})},
      });
    }
    else{
      res.status(200).json({
        status: "success",
        data:  {...(await transformationSupplier(supplier)), access_token: jwt.sign({_id: rest._id, role: req.role}, process.env.JWT_SECRET, {})},
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const deliveryBoyLogin = async (req, res) => {
  const deliveryBoyEmail = req.body.email;
  const deliveryBoyPassword = req.body.password;
  const deviceToken = req.body.deviceToken;

  try {
    const deliveryBoy = await DeliveryBoy.findOne({ email: deliveryBoyEmail });
    if (!deliveryBoy) {
      return res.status(207).json({
        status: "fail",
        message: "Delivery Boy Not Found",
      });
    }
    // Compare passwords using bcrypt.compare
    const isPasswordMatch = await bcrypt.compare(
      deliveryBoyPassword,
      deliveryBoy.password
    );
    if (!isPasswordMatch) {
      return res.status(207).json({
        status: "fail",
        message: "Incorrect Password",
      });
    }
    const { password, ...rest } = deliveryBoy._doc;
    const deliveryBoyData = { ...rest, access_token: jwt.sign({_id: rest._id, role: "deliveryBoy"}, process.env.JWT_SECRET, {})};
    deliveryBoy.deviceToken = deviceToken;
    await deliveryBoy.save();
    res.status(200).json({
      status: "success",
      data: await transformationDeliveryBoy(deliveryBoyData),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const adminLogin = async (req, res) => {
  const adminEmail = req.body.email;
  const adminPassword = req.body.password;

  try {
    const admin = await Admin.findOne({ email: adminEmail});
    if (!admin) {
      return res.status(207).json({
        status: "fail",
        message: "Admin Not Found",
      });
    }
    // Compare passwords using bcrypt.compare
    const isPasswordMatch = await bcrypt.compare(
      adminPassword,
      admin.password
    );
    if (!isPasswordMatch) {
      return res.status(207).json({
        status: "fail",
        message: "Incorrect Password",
      }
      );
    }
    const { password, ...rest } = admin._doc;
    const adminData = { ...rest, access_token: jwt.sign({_id: rest._id, role: "admin"}, process.env.JWT_SECRET, {})};
    res.status(200).json({
      status: "success",
      data: await transformationAdmin(adminData),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

