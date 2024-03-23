import mongoose from 'mongoose';

const categorySchema =  mongoose.Schema({
  name:{
    type:String,
    required:[true,"Category should have a name"],
  },
  image:{
    type:String,
    required:[true,"Image should have an image"]
  },
  createdAt:{
    type:Date,
    default: Date.now,
  }
},{
  timestamps:true,
})

const Category = mongoose.model('Category',categorySchema);
export default Category;