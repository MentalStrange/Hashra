import { transformationDeliveryBoy } from "../format/transformationObject.js";
import Car from "../models/carSchema.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import Region from "../models/regionSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
const salt = 10 ;

export const getAllDeliveryBoy = async (req, res) => {
  const allDeliveryBoys = await Promise.all(
    (await DeliveryBoy.find()).map(async (delivery) => {
      return transformationDeliveryBoy(delivery);
    })
  );
  res.status(200).json({
    status: "success",
    data: allDeliveryBoys,
  });
}

export const getDeliveryById = async (req, res) => {
  const deliveryBoyId = req.params.id;
  try{
    const delivery = await DeliveryBoy.findById(deliveryBoyId);
    if (!delivery) {
      return res.status(207).json({
        status: "fail",
        message: "DeliveryBoy not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: {...(await transformationDeliveryBoy(delivery)), access_token: jwt.sign({_id: delivery._id, role: "deliveryBoy"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const createDeliveryBoy = async (req, res) => {
  const deliverBoyData = req.body;
  const deliveryBoyEmail = req.body.email;
  const deliveryRegion = req.body.region;
  const carId = req.body.car;
  
  try {
    const region = await Region.findById(deliveryRegion);
    if (!region) {
      return res.status(404).json({
        status: "fail",
        message: "Region not found",
      });
    }
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        status: "fail",
        message: "Car not found",
      });
    }
    const oldDeliveryBoy = await DeliveryBoy.find({ email: deliveryBoyEmail });
    if (oldDeliveryBoy.length > 0) {
      return res.status(207).json({
        status: "fail",
        message: "Delivery Boy already exists",
      });
    }
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password, salt);
    const deliveryBoy = new DeliveryBoy({
      ...deliverBoyData,
      password: hashedPassword,
    });
    await deliveryBoy.save();
    res.status(201).json({
      status: "success",
      data: await transformationDeliveryBoy(deliveryBoy),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  }
};
export const updateDeliveryBoy = async (req,res) => {
  const deliveryBoyId = req.params.id;
  const deliveryBoyData = req.body;
  try {
    if(req.body.car){
      const car = await Car.findById(req.body.car);
      if(!car){
        return res.status(404).json({
          status: "fail",
          message: "Car not found",
        });
      }
    }
    const updatedDeliveryBoy = await DeliveryBoy.findByIdAndUpdate(deliveryBoyId, deliveryBoyData, { new: true });
    if (updatedDeliveryBoy) {
      res.status(200).json({
        status: "success",
        data: await transformationDeliveryBoy(updatedDeliveryBoy),
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Delivery Boy not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const changeImageDeliveryBoy = async (req, res) => {
  const deliveryBoyId = req.params.id;
  try{
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(207).json({
        status: "fail",
        message: "DeliveryBoy not found"
      });
    }

    const pathName = deliveryBoy.image.split('/').slice(3).join('/');
    fs.unlink('upload/' + pathName, (err) => {});
    deliveryBoy.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await deliveryBoy.save();
    return res.status(200).json({
      status: "success",
      data: await transformationDeliveryBoy(deliveryBoy),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const getDeliveryBoyByRegion = async (req,res) => {
  const regionName = req.params.regionName;
  try{
    const region = await Region.findOne({name: regionName});
    const allDeliveryBoys = await Promise.all(
      (await DeliveryBoy.find({region: region._id})).map(async (delivery) => {
        return transformationDeliveryBoy(delivery);
      })
    );
    res.status(200).json({
      status: "success",
      data: allDeliveryBoys,
    });
   } catch (error) {
    res.status(500).json({
      status: "fail",
      message: "region not found",
    });
  }
}