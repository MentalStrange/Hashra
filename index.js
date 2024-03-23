import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from "socket.io";
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import authRoute from './routes/auth.js';
import supplierRoute from './routes/supplier.js';
import customerRoute from './routes/customer.js';
import productRoute from './routes/product.js';
import adminRoute from './routes/admin.js';
import { getOrderByDelivery } from './controllers/orderController.js';
import Order from './models/orderSchema.js';
import { pushNotification } from './utils/pushNotification.js';
import { checkExpireGroup } from './utils/checkExpireGroup.js';
import { CronJob } from 'cron';
import DeliveryBoy from './models/deliveryBoySchema.js';
import Supplier from './models/supplierSchema.js';
import Customer from './models/customerSchema.js';
import Group from './models/groupSchema.js';
import { getGroupByDelivery } from './controllers/groupController.js';
import { updateOrderForGroup } from './utils/updateOrderForGroup.js';
import Fee from './models/feesSchema.js';
import { checkInProgressOrder, checkPendingOrder } from './utils/checkPendingInProgressOrder.js';

dotenv.config();
const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const IO = new Server(server, { cors: { origin: "*" } });
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const corsOption = { origin: true };

const connectDB = async () => {
  try {
    // await mongoose.connect(process.env.MONGODB_URL_DEVZAKI);
    // await mongoose.connect(process.env.MONGODB_URL_LOCAL);
    await mongoose.connect(process.env.MONGODB_URL_DEV);
    console.log("Mongoose connection successfully established");
  } catch (error) {
    console.log('Mongoose connection error: ' + error);
  }
};

// check the status of the group
const cronJob1 = new CronJob('0 0 * * *', checkExpireGroup);
const cronJob2 = new CronJob('0 0 * * *', checkPendingOrder);
const cronJob3 = new CronJob('0 0 * * *', checkInProgressOrder);
// cronJob1.start();
cronJob2.start();
cronJob3.start();

app.use(express.json());
app.use(cors(corsOption));
app.use(express.static(path.join(__dirname, 'upload')));
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/supplier", supplierRoute);
app.use("/api/v1/customer", customerRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/admin", adminRoute);

app.get('/', async (req, res) => {
  res.send("<center><h1>Welcome to BlackHorse Company</h1></center>");
});

const userSocketIdMap = [];
IO.use((socket, next) => {
  if (socket.handshake.query) {
    let socketId = socket.handshake.query.socketId;
    socket.socketUser = socketId;
    userSocketIdMap[socket.socketUser] = socket.id;
    next();
  }
});

IO.on("connection", (socket) => {
  console.log(userSocketIdMap);
  socket.join(socket.socketUser);

  socket.on('disconnect', () => {
    delete userSocketIdMap[socket.socketUser];
    console.log("deleted:", userSocketIdMap);
  });

  socket.on("order", async (data) => {
    let orderId = data.orderId;
    let status = data.status;
    let deliveryId = data.deliveryId;
    console.log("orderId:", orderId);
    console.log("status:", status);
    console.log("deliveryId:", deliveryId);
    if(deliveryId && orderId && status){
      console.log("One");
      const delivery = await DeliveryBoy.findById(deliveryId);
      const order = await Order.findById(orderId);
      order.status = status;
      order.deliveryBoy = deliveryId;
      await order.save();
      if(order.status === 'willBeDelivered'){
        const customer = await Customer.findById(order.customerId);
        await pushNotification("لديك طلب جديد", `لديك اوردر جديد بوزن ${order.orderWeight/1000} كيلو ينتظر موافقتك`, null, null, null, deliveryId, delivery.deviceToken);
        await pushNotification("تم الموافقة ع الطلب", `تم اسناد الاوردر الخاص بك برقم ${order.orderNumber} الي عامل التوصيل`, null, order.customerId, null, null, customer.deviceToken);
      }
      IO.to(userSocketIdMap[deliveryId]).emit("order", await getOrderByDelivery(deliveryId));
    }
    else if(orderId && status){
      console.log("Two");
      const order = await Order.findById(orderId);
      order.status = status;
      await order.save();
      if(order.status === 'delivery'){
        const supplier = await Supplier.findById(order.supplierId);
        const customer = await Customer.findById(order.customerId);
        await pushNotification("تم الموافقة!", `قام عامل التوصيل بالموافقة ع توصيل الاوردر رقم ${order.orderNumber}`, null, null, order.supplierId, null, supplier.deviceToken);
        await pushNotification("وافق عامل التوصيل", `تم الموافقة ع توصيل الاوردر برقم ${order.orderNumber}`, null, order.customerId, null, null, customer.deviceToken);
      } else if (order.status === 'complete') {
        const supplier = await Supplier.findById(order.supplierId);
        const customer = await Customer.findById(order.customerId);
        await pushNotification("طلب شراء مكتمل", `تم استلام اوردر رقم ${order.orderNumber} بنجاح`, null, order.customerId, null, null, customer.deviceToken);
        const fee = await Fee.findOne();
        supplier.wallet += order.totalPrice * (fee.amount / 100);
        await supplier.save();
      }
      // IO.to(userSocketIdMap[order.deliveryBoy]).emit("order", await getOrderByDelivery(order.deliveryBoy));
    }
    else if(deliveryId){
      console.log("Three");
      IO.to(userSocketIdMap[deliveryId]).emit("order", await getOrderByDelivery(deliveryId));
    }
  });

  socket.on("group", async (data) => {
    let groupId = data.groupId;
    let status = data.status;
    let deliveryId = data.deliveryId;
    console.log("groupId:", groupId);
    console.log("status:", status);
    console.log("deliveryId:", deliveryId);
    if(deliveryId && groupId && status){
      console.log("One");
      const delivery = await DeliveryBoy.findById(deliveryId);
      const group = await Group.findById(groupId);
      group.status = status;
      group.deliveryBoy = deliveryId;
      await group.save();
      const orders = await Order.find({ group: groupId });
      orders.forEach(async orderId => {
        await updateOrderForGroup(orderId._id, status)
      });
      if(group.status === 'willBeDelivered'){
        await pushNotification("لديك طلب جديد", `لديك اوردر جديد بوزن ${group.totalWeight/1000} كيلو ينتظر موافقتك`, null, null, null, deliveryId, delivery.deviceToken);
        group.customer.forEach(async cust => {
          const customerData = await Customer.findById(cust);
          await pushNotification("تم الموافقة ع الطلب", "تم اسناد الاوردر الخاص بك الموجود داخل الجروب الي عامل التوصيل", null, customerData.customerId, null, null, customerData.deviceToken);
        });
      }
      IO.to(userSocketIdMap[deliveryId]).emit("group", await getGroupByDelivery(deliveryId));
    }
    else if(groupId && status){
      console.log("Two");
      const group = await Group.findById(groupId);
      group.status = status;
      await group.save();
      const orders = await Order.find({ group: groupId });
      orders.forEach(async orderId => {
        await updateOrderForGroup(orderId._id, status);
      });
      if(group.status === 'delivery'){
        const supplier = await Supplier.findById(group.supplierId);
        await pushNotification("تم الموافقة!", "قام عامل التوصيل بالموافقة ع توصيل الاوردرات الموجودة داخل الجروب", null, null, group.supplierId, null, supplier.deviceToken);
        group.customer.forEach(async cust => {
          const customerData = await Customer.findById(cust);
          await pushNotification("وافق عامل التوصيل", "تم الموافقة ع توصيل الاوردر الخاص بك داخل الجروب من قبل عامل التوصيل", null, customerData.customerId, null, null, customerData.deviceToken);
        });
      }
    }
    else if(deliveryId){
      console.log("Three");
      IO.to(userSocketIdMap[deliveryId]).emit("group", await getGroupByDelivery(deliveryId));
    }
  });
});

server.listen(port, async () => {
  await connectDB();
  // await pushNotification("بودي الطااير", "المشطشط عم اعمام الطايرين كلها", "", "", "", "", ["esV3hrGBSpKitM9xdl8ggy:APA91bEY005EUFrVzY-SrXU7NqYYDiUTWNY1237097H8Dt2nYo4KfrrMDubKV2o4hrg5qU3jqvQTiDP8FDuIWK3iO5IG2TX1HWJWF3WodJE4dNzD6iHfylnk4WwaQL6utckvVNMquWcz"/*"fQa6phIPTxK9bf1GrAnJHL:APA91bGnB71jOWb3F4qqF3I0xhIAyutZSXi2WRnrtGgITR9Cow_DWA7o9_OzcYT8r6CJJcBzCzajkBhBLnAfnPN_z96rK8BB18grBjtoYj8kE5nmoN6tAQ04KHnbpwssIGUV2Rvn7jfo"]) //,"e2-Rwm4tQCOWQCxv3koLeY:APA91bGJJGuBFiMWF_JN51spBC_2mj9ZiM9XzQrnYGdQtEI47EmIbX1E0v1i4UvozE0T3Yojt3IL8A-U6KJmczrJUUx1gnY2ARbrw7nVDmWtKzGtfrrk-lFWKbt84I6OMvTbUKSS_swr"*/]);
  console.log(`listening on http://localhost:${port}`);
});
