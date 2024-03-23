// import multer from "multer";
// import path from "path";
// import Customer from "../models/customerSchema.js";
// import {transformationCustomer} from "./transformationObject.js";
//
// /************************************ UploadPhoto Customer ************************************/
//
// // Configure Multer to handle file uploads
// const storage = multer.diskStorage({
//     destination: './upload/customer', // set your upload directory
//     filename: (req, file, callback) => {
//         const customerId = req.params.id; // Get customerId from request parameters
//         callback(null, `${customerId}${path.extname(file.originalname)}`);
//     },
// });
//
// const singleFileUpload = multer({ storage: storage }).single('image');
//
// // Function to handle file upload
// export const uploadPhoto = async (req, res) => {
//     const customerId = req.params.id;
//
//     try {
//         const customer = await Customer.findOne({_id: customerId});
//         if(!customer){
//             return res.status(207).json({
//                 status:"fail",
//                 message:"Customer not found"
//             })
//         }
//
//         // Using singleFileUpload as middleware to handle file upload
//         singleFileUpload(req, res, async (err) => {
//             if (err) {
//                 return res.status(400).json({error: err.message});
//             }
//             // Image uploaded successfully
//             customer.image = `${process.env.BASE_URL}/upload/customer/${req.file.filename}`;
//             await customer.save();
//             return res.status(200).json({
//                 status: "success",
//                 data: transformationCustomer(customer),
//                 message: req.headers['language'] === 'en' ? "The account photo has been successfully modified" : "تم تعديل صورة الحساب بنجاح"
//             });
//         });
//     } catch (error) {
//         // Handle any errors that occur during the process
//         console.error(error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal server error"
//         });
//     }
// };



/********************************************************************/
// const formattedOrders = orders.map(async order => {
//     const formattedOrder = {
//         ...order.toObject(),
//         supplier: order.supplierId.type // Extracting the supplier type
//     };
//
//     if (formattedOrder.status === 'complete' && formattedOrder.supplierRating === "notRating") {
//         formattedOrder.supplierRating = 'ignore';
//         // await formattedOrder.save();
//     }
//     return formattedOrder;
// });
//
// // formattedOrders.reverse();
// res.status(200).json({
//     status: "success",
//     data: formattedOrders
// });