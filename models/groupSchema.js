import mongoose from 'mongoose';
import GroupExpireDate from './groupExpireDate.js';

const groupSchema = mongoose.Schema({
  name:{
    type:String,
    required:[true, "Group should have a region"],
  },
  supplierId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Supplier",
    required:[true, "Group should have a supplier Id"],
  },
  customer:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:"Customer",
    }
  ],
  // maximumCustomer:{
  //   type:Number,
  // },
  status:{
    type:String,
    enum:["pending", "complete", "expired", "canceled", "delivery", "inProgress", "willBeDelivered", "trash", "completed"],
    default:"pending",
  },
  expireDate:{
    type:Date,
  },
  createdAt:{
    type:Date,
    default: Date.now,
  },
  deliveryBoy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DeliveryBoy"
  },
  totalPrice:{
    type:Number,
    default:0,
  },
  totalWeight:{
    type:Number,
    default:0,
  }
},{
  timestamps:true,
})

groupSchema.pre("save", async function(next) {
  try {
    const expireDateConfig = await GroupExpireDate.findOne();    
    if (!expireDateConfig) {
      throw new Error("Expiration date configuration not found");
    }
    const daysToAdd = expireDateConfig.date;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysToAdd);
    this.expireDate = expirationDate;
    next(); 
  } catch (error) {
    next(error);
  }
}); 
const Group = mongoose.model('Group',groupSchema);
export default Group;