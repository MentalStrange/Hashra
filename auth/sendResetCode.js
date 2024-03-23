import Customer from "../models/customerSchema.js";
import bcrypt from "bcrypt";
import { transformationCustomer } from "../format/transformationObject.js";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
const salt = 10 ;


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.email',
    secure: false,
    service: 'gmail',
    auth: {
        user: 'ahmedzaki789123@gmail.com',
        pass: 'eejokqorrpywlalr',
    },
});

/************************************ ForgetPassword Customer ************************************/
export const sendResetCodeCustomer = async (req, res) => {
    const customerEmail = req.body.email;
    try {
        const customer = await Customer.findOne({ email: customerEmail });
        if(!customer){
            return res.status(207).json({
                status:"fail",
                message: req.headers['language'] === 'en' ? "Email not found" : "البريد الالكتروني غير موجود"
            })
        }

        customer.resetCode = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
        await customer.save();
        const source = fs.readFileSync('./views/resetPassword.html', 'utf-8').toString();
        const template = handlebars.compile(source);

        await transporter.sendMail({
            from: 'ahmedzaki789123@gmail.com',
            to: customer.email,
            subject: 'تعين كلمة المرور',
            // text: 'Hello world?',
            html: template({
                resetCode: customer.resetCode,
            })
        });
        res.status(200).json({
            status: "success",
            data: "Email send successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};

export const resetPasswordCustomer = async (req, res) => {
    const customerEmail = req.body.email;
    const resetCode = req.body.resetCode;
    const newPassword = req.body.newPassword;
    try {
        const customer = await Customer.findOne({ email: customerEmail });
        if(!customer){
            return res.status(207).json({
                status:"fail",
                message: req.headers['language'] === 'en' ? "Email not found" : "البريد الالكتروني غير موجود"
            })
        }

        if(customer.resetCode !== resetCode){
            return res.status(208).json({
                status:"fail",
                message: req.headers['language'] === 'en' ? "The code is incorrect. Please enter the correct code" : "الكود خطأ برجاء ادخال الكود الصحيح"
            })
        }

        customer.password = await bcrypt.hash(newPassword.toString(), salt);
        customer.resetCode = null;
        await customer.save();
        res.status(200).json({
            status: "success",
            data: transformationCustomer(customer),
            access_token: jwt.sign({_id: customer._id, role: "customer"}, process.env.JWT_SECRET, {})
        });
    } catch (error) {
        res.status(500).json({
            status: "fail",
            message: error.message,
        });
    }
};