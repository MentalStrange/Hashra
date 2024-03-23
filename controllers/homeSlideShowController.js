import HomeSlideShow from "../models/homeSlideShowSchema.js";
import fs from "fs";

export const createHomeSlideShow = async (req, res) => {
  try {
    const homeSlideShow = new HomeSlideShow({
      image:`${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    });
    await homeSlideShow.save();
    res.status(201).json({
      status: "success",
      data: homeSlideShow
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
}

export const deleteHomeSlideShow = async (req, res, next) => {
  const homeSlideShowId = req.params.id;
  try {
    if(homeSlideShowId){
      const homeSlideShow = await HomeSlideShow.findByIdAndDelete(homeSlideShowId);
      const pathName = homeSlideShow.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
      res.status(204).json({
        status:"success",
        data:null,
      })
    }else{
      throw new Error("Can not find home slide show")
    }
  } catch (error) {
    res.status(500).json({status: "fail", message: error.message})
  }
}

export const getAllHomeSlideShow = async (req, res) => {
  try {
    const homeSlideShow = await HomeSlideShow.find();
    if (homeSlideShow) {
      res.status(200).json({
        status: "success",
        data: homeSlideShow
      });
    } else {
      throw new Error("Home slide show not found");
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
};
