import  mongoose  from "mongoose";

const unitSchema = mongoose.Schema({
  name:{
    type:String,
    required:[true, "Unit should have a name"],
  },
  maxNumber:{
    type:Number,
    required:[true, "Unit should have a max Number"],
  }
})

const Unit = mongoose.model('Unit', unitSchema);
export default Unit