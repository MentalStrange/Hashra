import mongoose from 'mongoose';
import Product from './productSchema.js';
import Unit from './unitSchema.js';

const supplierProductSchema = mongoose.Schema({
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required:[true, 'Supplier is required'],
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required:[true, 'productId is required'],
    },
    price:{
        type:Number,
        required:[true, 'Product should have a price'],
    },
    stock:{
        type:Number,
        required:[true, 'Product should have a stock'],
        default:1
    },
    afterSale:{
      type:Number,
    },
    maxLimit:{
      type:Number,
    },
    unit:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Unit",
    },
    subUnit:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"SubUnit",
      required:[true, 'Product should have a subUnit'],
    },
    productWeight:{
      type:Number,
    },
    createdAt:{
      type:Date,
      default:Date.now
    },
    status:{
      type:String,
      enum:["active",'inActive']
    }
},{
  timestamps: true,
})
const SupplierProduct = mongoose.model('SupplierProduct', supplierProductSchema);

export default SupplierProduct;