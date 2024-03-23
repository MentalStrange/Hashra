import Customer from "../models/customerSchema.js";
import Supplier from "../models/supplierSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  transformationAdmin,
  transformationCustomer,
  transformationSupplier,
} from "../format/transformationObject.js";
import Region from "../models/regionSchema.js";
import Admin from "../models/adminSchema.js";
const salt = 10;

export const createSupplier = async (req, res) => {
  const supplierData = req.body;
  const supplierEmail = req.body.email;
  const regionsId = req.body.deliveryRegion;
  try {
    // Check for existing supplier using findOne
    const existingSupplier = await Supplier.findOne({ email: supplierEmail });
    if (existingSupplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier already exists",
      });
    }  
    // Initialize deliveryRegion
    let deliveryRegion = [];
    // Validate all regions first
    if (regionsId && regionsId.length > 0) {
      const regionPromises = regionsId.map(async (region) => {
        const regionName = await Region.findById(region);
        if (!regionName) {
          return res.status(208).json({
            status: "fail",
            message: `Region with ID ${region} not found`,
          });
        }
        return regionName._id;
      });
      deliveryRegion = await Promise.all(regionPromises);
    }
    // All regions are valid, proceed with supplier creation
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password, salt);
    const newSupplier = await Supplier.create({
      name: supplierData.name,
      email: supplierData.email,
      phone: supplierData.phoneNumber,
      image: supplierData.image || "",
      nationalId: supplierData.nationalId,
      minOrderPrice: supplierData.minOrderPrice,
      deliveryRegion: deliveryRegion, // Assign deliveryRegion here
      workingDays: supplierData.workingDays,
      workingHours: supplierData.workingHours,
      deliveryDaysNumber: supplierData.deliveryDaysNumber,
      type: supplierData.type,
      password: hashedPassword,
      desc: supplierData.desc,
      wallet: supplierData.wallet,
      placeImage: supplierData.placeImage,
    });
    // Determine supplier status
    let status = "active";
    Object.entries(newSupplier.toObject()).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) {
        status = "inactive";
      } else if (typeof value === "string" && value.trim() === "") {
        status = "inactive";
      } else if (typeof value === "number" && isNaN(value)) {
        status = "inactive";
      }
    });
    // Update supplier status
    newSupplier.status = status;
    await newSupplier.save();
    return res.status(201).json({
      status: "success",
      data: await transformationSupplier(newSupplier),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  }
};

export const createCustomer = async (req, res) => {
  const customerData = req.body;
  const customerEmail = req.body.email;
  try {
    const oldCustomer = await Customer.find({ email: customerEmail });
    if (oldCustomer.length > 0) {
      return res.status(404).json({
        status: "fail",
        message:
          req.headers["language"] === "en"
            ? "email already exists"
            : "الايميل الإلكتروني موجود بالفعل",
      });
    }
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password.toString(), salt);
    const image = customerData.image?customerData.image:"";
    const newCustomer = new Customer({
      ...customerData,
      image: image,
      password: hashedPassword,
    });
    const customer = await transformationCustomer(newCustomer);
    await newCustomer.save();
    res.status(201).json({
      status: "success",
      data:  {...customer, access_token: jwt.sign({_id: newCustomer._id, role: "customer"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  }
};

export const createSubAdmin = async (req, res) => {
  const subAdminData = req.body;
  const subAdminEmail = req.body.email;
  try {
    const oldSubAdmin = await subAdmin.find({ email: subAdminEmail });
    if (oldSubAdmin.length > 0) {
      return res.status(404).json({
        status: "fail",
        message:
          req.headers["language"] === "en"
            ? "email already exists"
            : "الايميل الإلكتروني موجود بالفعل",
      });
    }
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password.toString(), salt);
    const image = subAdminData.image?subAdminData.image:"";
    const newSubAdmin = new SubAdmin({
      ...subAdminData,
      image: image,
      password: hashedPassword,
    });
    const subAdmin = await transformationSubAdmin(newSubAdmin);
    await newSubAdmin.save();
    res.status(201).json({
      status: "success",
      data:  {...subAdmin, access_token: jwt.sign({_id: newSubAdmin._id, role: "subAdmin"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  } 
};

export const createAdmin = async (req, res) => {
  const adminData = req.body;
  const adminEmail = req.body.email;
  try {
    const oldAdmin = await Admin.find({ email: adminEmail });
    if (oldAdmin.length > 0) {
      return res.status(404).json({
        status: "fail",
        message:
          req.headers["language"] === "en"
            ? "email already exists"
            : "الايميل الإلكتروني موجود بالفعل",
      });
    }
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password.toString(), salt);
    const image = adminData.image?adminData.image:"";
    const newAdmin = new Admin({
      ...adminData,
      image: image,
      password: hashedPassword,
    });
    const admin = await transformationAdmin(newAdmin);
    await newAdmin.save();
    res.status(201).json({
      status: "success",
      data:  {...admin, access_token: jwt.sign({_id: newAdmin._id, role: "admin"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  }
};
