import Category from "../models/categorySchema.js";
import fs from "fs";
import Product from "../models/productSchema.js";

export const createCategory = async (req, res) => {
  const categoryData = req.body;
  const categoryName = req.body.name;

  try {
    const oldCategory = await Category.find({ name: categoryName });
    if (oldCategory.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'Category already exists',
      });
    }
    const category = new Category({
      name: categoryData.name,
      image:`${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    });
    await category.save();
    res.status(201).json({
      status: 'success',
      data: category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal Server Error',
    });
  }
};

export const getAllCategory = async (req,res) => {
  try {
    const category = await Category.find().sort(req.query.category);
    if(category){
      res.status(200).json({
        status:"success",
        data: category
      })
    }else{
      throw new Error("Couldn't find category");
    }
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    }); 
  }
}
export const deleteCategory = async (req, res) => {
  const categoryId = req.params.id;
  try {
    const product = await Product.findOne({ category: categoryId });
    if(product){
      return res.status(207).json({
        status: 'fail',
        message: 'Category is used in products',
      })
    }
    if(categoryId){
      const category = await Category.findByIdAndDelete(categoryId);
      const pathName = category.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
      res.status(200).json({
        status:"success",
        data:null
      })
    }else{
      throw new Error("Can not found this category");
    }
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}
export const updateCategory = async (req, res) => {
  const categoryId = req.params.id;
  const categoryData = req.body;
  try {
    if(categoryId){
      await Category.findByIdAndUpdate(categoryId, categoryData, { new: true });
      res.status(200).json({
        status:"success",
        data:categoryData
      })
    }else{
      throw new Error("Can not found this category");
    }
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}

export const changeImageCategory = async (req, res) => {
  const categoryId = req.params.id;
  try {
    const category = await Category.findById(categoryId);
    const pathName = category.image.split('/').slice(3).join('/');
    fs.unlink('upload/' + pathName, (err) => {});
    category.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    await category.save();
    res.status(200).json({
      status:"success",
      data: category
    })
   } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}