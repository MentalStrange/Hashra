import { transformationGroup } from "../format/transformationObject.js";
import Customer from "../models/customerSchema.js";
import Group from "../models/groupSchema.js";
import Order from "../models/orderSchema.js";
import Supplier from "../models/supplierSchema.js";
import paginateResponse from "../utils/paginationResponse.js";
import { updateOrderForGroup } from "../utils/updateOrderForGroup.js";

export const createGroup = async (req, res) => {
  const name = req.body.name;
  const supplierId = req.body.supplierId;
  try {
    const group = await Group.findOne({
      name,
      supplierId: supplierId,
      status:"pending"
    });
    if (group) {
      return res.status(400).json({
        status: "fail",
        message: "Group already exists",
      });
    }
    const newGroup = new Group({
      ...req.body,
    });
    newGroup.save();
    res.status(201).json({
      status: "success",
      data: await transformationGroup(newGroup),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  }
};
export const getAllGroupForAdmin = async (req, res) => {
  try {
    const groups = await Group.find();
    const transformationGroupData = await Promise.all(
      groups.map(async (group) => {
        return await transformationGroup(group)
      })
    )
    if(!transformationGroupData){
      return res.status(404).json(
        {
          status:"fail",
          data:[],
          message:"No Groups Found"
        }
      )
    }
    res.status(200).json({
      status:"success",
      data:transformationGroupData
    })
  } catch (error) {
    res.status(500).json({
      status:"fail",
      message:error.message
    })
  }
};
export const getAllGroupForCustomer = async (req, res) => {
  const customerId = req.body.customerId;
  const region = req.body.region;
  try {
    const customer = await Customer.findById(customerId);
    if (customer) {
      const group = await Group.find({ region: region, status: "pending" });
      const transformationGroup = await Promise.all(
        group.map(async (group) => {
          return await transformationGroup(group);
        })
      );
      if (group) {
        return res.status(200).json({
          status: "success",
          data: transformationGroup,
        });
      } else {
        res.status(404).json({
          status: "fail",
          message: "Customer not found",
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const updateGroup = async (req, res) => {
  const groupId = req.params.id;
  const groupStatus = req.body.status;
  const deliveryBoy = req.body.deliveryBoy;
  try {
    const group = await Group.findById(groupId).sort({ createdAt: -1 });
    if (!group) {
      return res.status(404).json({
        status: "fail",
        data: {},
        message: "No Group Found By This Id",
      });
    }
    const orders = await Order.find({ group: groupId });
    if (groupStatus === "completed") {
      group.status = "completed";
      await Promise.all(
        orders.map(async (order) => {
          await updateOrderForGroup(order._id, "complete");
        })
      );
    }
    if (groupStatus === "inProgress") {
      group.status = "inProgress";
      await Promise.all(
        orders.map(async (order) => {
          await updateOrderForGroup(order._id, "inProgress");
        })
      );
    }
    if (groupStatus === "canceled") {
      group.status = "canceled";
      await Promise.all(
        orders.map(async (order) => {
          await updateOrderForGroup(order._id, "canceled",req);
        })
      );
    }
    if (deliveryBoy) {
      group.deliveryBoy = deliveryBoy;
      await Promise.all(
        orders.map(async (order) => {
          await updateOrderForGroup(order._id, deliveryBoy);
        })
      )
    }
    await group.save();
    res.status(200).json({
      status: "success",
      message: "Group updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const joinGroup = async (req, res) => {
  const groupId = req.params.id;
  const orderId = req.body.order;
  const customerId = req.body.customerId;
  try {
    const customer = await Customer.findById(customerId);
    const order = await Order.findByIdAndUpdate(orderId, { group: groupId });
    if (!customer) {
      return res.status(406).json({
        status: "fail",
        data: [],
        message: "Customer Not Found",
      });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(405).json({
        status: "fail",
        message: "Group Not Found",
      });
    }
    const supplier = await Supplier.findById(group.supplierId);
    if (group.customer.includes(customerId)) {
      return res.status(403).json({
        status: "fail",
        message: "Customer Already Joined",
      });
    }
    if (!order.supplierId.equals(group.supplierId)) {
      return res.status(403).json({
        status: "fail",
        message: "Can Not Join To This Group As Supplier Is Different",
      });
    }
    await order.save();
    let totalPrice = order.totalPrice;
    let totalWeight = order.orderWeight;
    group.customer.push(customerId);
    group.totalPrice += totalPrice;
    group.totalWeight += totalWeight;
    group.numberOfCustomer += 1;
    if (group.totalPrice >= supplier.minOrderPrice) {
      group.status = "complete";
      // await Promise.all(
      //   orders.map(async (order) => {
      //     order.status = "complete";
      //     order.save();
      //   })
      // )
    }
    await group.save();
    // const updateGroup = await transformationGroup(group);
    res.status(200).json({
      status: "success",
      data: await transformationGroup(group),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
// will be for supplier to accept or reject it....
export const getAllGroupCompleteForSupplier = async (req, res) => {
  const supplierId = req.params.id;
  const status = req.query.status;
  try {
    const group = status ? await Group.find({ status: {$ne:"pending"}, supplierId: supplierId , status: status}).sort({ createdAt: -1 }) : await Group.find({ status: {$ne:"pending"}, supplierId: supplierId }).sort({ createdAt: -1 });
    const transformationGroupDate = await Promise.all(
      group.map(async (group) => {
        return await transformationGroup(group);
      })
    )
    if (group) {
      paginateResponse(res, req.query, transformationGroupDate, group.length);
    } else {
      return res.status(200).json({
        status: "fail",
        data: [],
        message: "No Group Completed Founded",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
// will be for delivery boy to see the order that should be delivered
// export const getAllGroupDelivery = async (req, res) => {
//   const deliveryBoy = req.params.id;
//   try {
//     const group = await Group.findById(deliveryBoy);
//     const transformationGroupDate = await Promise.all(
//       group.map(async (group) => {
//         return await transformationGroup(group);
//       })
//     );
//     if (group) {
//       return res.status(200).json({
//         status: "success",
//         data: transformationGroupDate,
//       });
//     } else {
//       return res.status(200).json({
//         status: "fail",
//         data: [],
//         message: "No Group Founded",
//       });
//     }
//   } catch (error) {
//     res.status(500).json({
//       status: "fail",
//       message: error.message,
//     });
//   }
// };
export const getGroupByDeliveryRoute = async (req, res) => { // use http
  const deliveryId = req.params.deliveryId;

  try {
    const totalGroups = await Group.countDocuments({ deliveryBoy: deliveryId, status: 'completed' });
    const groups = await Group.find({ deliveryBoy: deliveryId, status: 'completed' }).sort({ createdAt: -1 });
    const groupByDelivery = await Promise.all(
      groups.map(async (group) => {
        return await transformationGroup(group);
      })
    );
    // res.status(200).json({
    //   status: "success",
    //   data: groupByDelivery,
    // })
    paginateResponse(res, req.query, groupByDelivery, totalGroups);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getGroupByDelivery = async (deliveryId) => { // use socket
  const groups = await Group.find({ 
    deliveryBoy: deliveryId, 
    status: { $in: ['willBeDelivered', 'delivery'] } 
  }).sort({ createdAt: -1 });;

  return await Promise.all(
    groups.map(async (group) => {
      return await transformationGroup(group);
    })
  );
};
// will be for customer to see the all group from the same region for the same supplier.
export const getAllGroupPending = async (req, res) => {
  const region = req.query.region;
  const supplierId = req.query.supplierId;
  console.log('region:', region, 'supplierId:', supplierId);
  
  try {
    const group = await Group.find({
      status: "pending",
      region: region,
      supplierId: supplierId,
    });
    const transformationGroupData = await Promise.all(
      group.map(async (group) => {
        return transformationGroup(group);
      })
    );
    if (group.length >0) {
      paginateResponse(res, req.query, transformationGroupData, group.length);
      // return res.status(200).json({
      //   status: "success",
      //   data: transformationGroupData,
      // });
    } else {
      return res.status(200).json({
        status: "fail",
        data: [],
        message: "No Group Pending Founded",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const canceledGroupByCustomerId = async (req, res) => {
  const groupId = req.params.id;
  const customerId = req.body.customerId;
  try {
    const group = await Group.findOne({ _id: groupId, status: "pending" });
    if (!group) {
      return res.status(404).json({
        status: "fail",
        message: "Group Not Found",
      });
    }
    const existingCustomer = group.customer.includes(customerId);
    if (!existingCustomer) {
      return res.status(404).json({
        status: "fail",
        message: "Customer Not Found",
      });
    }
    group.customer = group.customer.filter(
      (customer) => customer !== customerId
    );
    group.numberOfCustomer -= 1;
    const order = await Order.findOne({
      group: groupId,
      customerId: customerId,
    });
    updateOrderForGroup(order._id, "canceled");
    group.save();
    res.status(200).json({
      status: "success",
      data: transformationGroup(group),
    });
  } catch (error) {}
};
