import Group from "../models/groupSchema.js";
import Order from "../models/orderSchema.js";
import { updateOrderForGroup } from "./updateOrderForGroup.js";

export const checkExpireGroup = async () => {
  try {
    const expiredGroups = await Group.find({
      expireDate: { $lte: new Date() },
      status: { $ne: "expired" },
    });
    await Promise.all(
      expiredGroups.map(async (group) => {
        group.status = "expired";
        const orders = await Order.find({ group: group._id });
        await Promise.all(
          orders.map(async (order) => {
            await updateOrderForGroup(order._id, "canceled");
          })
        );
        await group.save();
      })
    );
    console.log("Expired groups updated successfully");
  } catch (error) {
    console.error("Error updating expired groups:", error);
  }
};
