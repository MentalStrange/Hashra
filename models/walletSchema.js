import mongoose from 'mongoose'

const walletSchema = mongoose.Schema({
  supplierId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Supplier",
    required:[true, "Supplier is required"],
  },
  blackHorseCommission:{
    type:Number,
    default:0
  },
  fine:{
    type:Number,
    default:0
  },
  balance:{
    type:Number,
    default:0
  },
})

export default mongoose.model('Wallet', walletSchema)
