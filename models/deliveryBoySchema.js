import mongoose from 'mongoose';

const deliveryBoySchema = mongoose.Schema({
  name:{
    type:String,
    required:[true, "Delivery Boy should have a name"]
  },
  email:{
    type:String,
    required:[true,'Delivery Boy Should have an email'],
    unique:true,
    match: /^\S+@\S+\.\S+$/, 
  },
  nationalId:{
    type:Number,
    required:[true,'Delivery Boy Should have a national Id'],
    unique:true,
  },
  password:{
    type:String,
    required:[true,'Delivery Boy Should have a password']
  },
  image:{
    type:String,
    // required:[true,'Delivery Boy Should have an image'],
  },
  phone:{
    type:String,
    required:[true,'Delivery Boy Should have a Phone']
  },
  region:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Region",
    required:[true,'Delivery Boy Should have a region']
  },
  car:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Car",
    required:[true,'Delivery Boy Should have a car']
  },
  deviceToken:{
    type:String,
  }
})

const DeliveryBoy = mongoose.model('Delivery Boy', deliveryBoySchema);
export default DeliveryBoy;