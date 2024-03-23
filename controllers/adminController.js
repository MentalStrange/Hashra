import Customer from "../models/customerSchema.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import HomeSlideShow from "../models/homeSlideShowSchema.js";
import Supplier from "../models/supplierSchema.js";
import bcrypt from "bcrypt";
import Unit from "../models/unitSchema.js";
import Fee from "../models/feesSchema.js";
import Region from "../models/regionSchema.js";
import GroupExpireDate from "../models/groupExpireDate.js";
import { transformationUnit } from "../format/transformationObject.js";
import SubUnit from "../models/subUnitSchema.js";
import mongoose from "mongoose"
import SupplierProduct from "../models/supplierProductSchema.js";
const salt = 10;

export const deleteSupplier = async (req, res) => {
  const supplierId = req.params.id;
  try {
    if (supplierId) {
      await Supplier.deleteOne({ _id: supplierId });
      res.status(404).json({
        status: "success",
        data: null,
      });
    } else {
      throw new Error(`Supplier can not be founded`);
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const deleteHomeSlideShow = async (req, res) => {
  const homeSlideShowId = req.params.id;
  try {
    if (homeSlideShowId) {
      await HomeSlideShow.findByIdAndDelete(homeSlideShowId);
      res.status(200).json({
        status: "success",
        data: null,
      });
    } else {
      throw new Error("Can not found this homeSlideShow");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllHomeSlideShow = async (req, res) => {
  try {
    const homeSlideShow = await HomeSlideShow.find();
    if (homeSlideShow) {
      res.status(200).json({
        status: "success",
        data: homeSlideShow,
      });
    } else {
      throw new Error("Could not find homeSlideShow");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const blockCustomer = async (req, res) => {
  const customerId = req.params.id;
  try {
    const customer = await Customer.findById(customerId);
    if (customer) {
      customer.status = "inactive";
      await customer.save();
      res.status(200).json({
        status: "success",
        data: customer,
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Customer not found",
      });
    }
  } catch (error) {
    res.status.json({
      status: "fail",
      message: error.message,
    });
  }
};
export const blockSupplier = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (supplier) {
      supplier.status = "inactive";
      await supplier.save();
      res.status(200).json({
        status: "success",
        data: supplier,
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
  } catch (error) {
    res.status.json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createUnit = async (req,res) => {
  const unit = req.body;
  const existingUnit = await Unit.findOne({ name: unit.name });
  if (existingUnit) {
    return res.status(207).json({
      status: "fail",
      message: `Unit ${unit.name} exists`,
    })
  }
  const newUnit = new Unit({
    name:unit.name,
    maxNumber:unit.number
  });
  await newUnit.save();
  res.status(201).json({
    status: "success",
    data: transformationUnit(newUnit),
  });
}
export const updateUnit = async (req,res) => {
  const unitId = req.params.id;
  const unitData = req.body;
  const existingUnit = await Unit.findOne({ name: unitData.name });
  if (existingUnit && existingUnit._id != unitId) {
    throw new Error(`Unit or subunit '${unitData.name}' already exists`);
  }
  const updatedUnit = await Unit.findByIdAndUpdate(
    unitId,
    unitData,
    { new: true }
  );
  if (updatedUnit) {
    res.status(200).json({
      status: "success",
      data: updatedUnit,
    });
  } else {
    throw new Error(`Unit not found`);
  }
}
export const deleteUnit = async (req, res) => {
  const unitId = req.params.id;
  try {
    const supplierProduct = await SupplierProduct.find({ unit: unitId });
    if(supplierProduct.length > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete unit as it is referenced by supplier products.',
      })
    }
    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      throw new Error('Invalid unit ID.');
    }
    const deletionResult = await Unit.deleteOne({ _id: unitId });
    if (deletionResult.deletedCount > 0) {
      res.status(200).json({
        status: 'success',
        message: 'Unit deleted successfully.',
      });
    } else {
      throw new Error('Unit not found.');
    }
  } catch (error) {
    res.status(error.statusCode || 404).json({
      status: 'fail',
      message: error.message || 'Not Found',
    });
  }
}
export const getAllUnits = async (req, res) => {
  try {
    const units = await Unit.find();
    if (units) {
      res.status(200).json({
        status: "success",
        data: units,
      });
    } else {
      throw new Error("Could not find units");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const createRegion = async (req, res) => {
  const region = req.body;  
  const existingRegion = await Region.findOne({ name: region.name });
  try{if (existingRegion) {
    return res.status(207).json({
      status: "fail",
      message: `Region ${region.name} exists`,
    }) 
  }
  const newRegion = new Region(region);
  await newRegion.save();
  res.status(201).json({
    status: "success",
    data: newRegion,
  });}
  catch(error){
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const getAllRegion = async (req,res) => {
  try {
    const regions = await Region.find();
    if (regions) {
      res.status(200).json({
        status: "success",
        data: regions,
      });
    } else {
      throw new Error("Could not find regions");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const deleteRegion = async (req, res) => {
  const regionId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(regionId)) {
      throw new Error('Invalid region ID.');
    }
    const supplier = await Supplier.find({ deliveryRegion: regionId });
    const deliveryBoys = await DeliveryBoy.find({ region: regionId });
    const customers = await Customer.find({ region: regionId });
    if(supplier.length > 0 || deliveryBoys.length > 0 || customers.length > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete region as it is referenced by suppliers, delivery boys, or customers.',
      })
    }
    const deletionResult = await Region.deleteOne({ _id: regionId });
    if (deletionResult.deletedCount > 0) {
      res.status(200).json({
        status: 'success',
        message: 'Region deleted successfully.',
      });
    } else {
      throw new Error('Region not found.');
    }
  } catch (error) {
    res.status(error.statusCode || 404).json({
      status: 'fail',
      message: error.message || 'Not Found',
    });
  }
}
export const createExpireDateGroup = async (req, res) => {
  const expireDateGroup = req.body;
  try {
    await GroupExpireDate.deleteMany();
    const newExpireDateGroup = new GroupExpireDate({
      date: expireDateGroup.date
    });
    await newExpireDateGroup.save();
    res.status(201).json({
      status: "success",
      data: newExpireDateGroup,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const createSubUnit = async (req, res) => {
  const subUnit = req.body;
  const existingSubUnit = await SubUnit.findOne({ name: subUnit.name });
  if (existingSubUnit) {
    return res.status(207).json({
      status: "success",
      message: `Subunit '${subUnit.name}' already exists`,
    });
  }
  const newSubUnit = new SubUnit(subUnit);
  await newSubUnit.save();
  res.status(201).json({
    status: "success",
    data: newSubUnit,
  });
}
export const updateSubUnit = async (req, res) => {
  const subUnitId = req.params.id;
  const subUnitData = req.body;
  const subUnit = await SubUnit.findByIdAndUpdate(
    subUnitId,
    subUnitData,
    { new: true }
  );
  if (subUnit) {
    res.status(200).json({
      status: "success",
      data: subUnit,
    });
  } else {
    throw new Error(`Subunit not found`);
  }
}
export const deleteSubUnit = async (req, res) => {
  const subUnitId = req.params.id;
  try {
    const supplierProduct = await SupplierProduct.find({ subUnit: subUnitId });
    if(supplierProduct.length > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete subUnit as it is referenced by supplier products.',
      })
    }
    if (!mongoose.Types.ObjectId.isValid(subUnitId)) {
      throw new Error('Invalid subUnit ID.');
    }
    const deletionResult = await SubUnit.deleteOne({ _id: subUnitId });
    if (deletionResult.deletedCount > 0) {
      res.status(200).json({
        status: 'success',
        message: 'SubUnit deleted successfully.',
      });
    } else {
      throw new Error('SubUnit not found.');
    }
  } catch (error) {
    res.status(error.statusCode || 404).json({
      status: 'fail',
      message: error.message || 'Not Found',
    });
  }
};
export const getAllSubUnits = async (req, res) => {
  try {
    const subUnits = await SubUnit.find();
    if (subUnits) {
      res.status(200).json({
        status: "success",
        data: subUnits,
      });
    } else {
      throw new Error("Could not find subUnits");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const getFee = async (req, res) => {
  try {
    const fee = await Fee.find({ type: "fee" });
    res.status(200).json({
      status: "success",
      data:  { amount: fee[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const createFee = async (req, res) => {
  try {
    const amount = req.body.amount;
    if(amount > 100){
      return res.status(207).json({
        status: "fail",
        message: "Amount should be less than 100%"
      })
    }
    await Fee.deleteMany({ type: "fee" });
    const newFee = new Fee({
      amount: req.body.amount,
      type: "fee"
    });
    await newFee.save();
    res.status(201).json({
      status: "success",
      data: { amount: newFee.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const createNumberOfPendingDaysOrder = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "numberOfPendingDaysOrder" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "numberOfPendingDaysOrder"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getNumberOfPendingDaysOrder = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "numberOfPendingDaysOrder" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForCancel = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForCancel"});
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForCancel"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data: {amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForCancel = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "fineForCancel" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const createFineForTrash = async (req, res) => {
  try {
    const fine = req.body;
    await Fee.deleteMany({ type: "fineForTrash" });
    const newFine = new Fee({
      amount: fine.amount,
      type: "fineForTrash"
    });
    await newFine.save();
    res.status(201).json({
      status: "success",
      data:  { amount: newFine.amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}
export const getFineForTrash = async (req, res) => {
  try {
    const fine = await Fee.find({ type: "fineForTrash" });
    res.status(200).json({
      status: "success",
      data:  { amount: fine[0].amount }
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    })
  }
}