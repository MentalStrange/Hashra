import mongoose from 'mongoose';
import SupplierProduct from './supplierProductSchema.js';

const productSchema = mongoose.Schema({
  title:{
    type:String,
    required:[true, 'Product should have a name'],
    unique: [true, 'Product should have a unique title'],
  },
  desc:{
    type:String,
    required:[true, 'Product should have a description'],
  },
  weight:{
    type:Number,
    required:[true, 'Product should have a weight'],
  },
  images:[{
    type:String,
    // required:[true, 'Product should have images']
  }],
  category:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Category",
    required:[true, 'Product should be associated with a category']
  },
})

productSchema.pre('remove', async function(next){
  try {
    await SupplierProduct.deleteMany({ productId: this._id });
    next();
  } catch (error) {
    next(error)
  }
})
const Product = mongoose.model("Product",productSchema);
export default Product;