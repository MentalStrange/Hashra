import mongoose from 'mongoose';
import Supplier from './supplierSchema.js';
import Car from './carSchema.js';

const orderProductSet = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  quantity: {
    type: Number,
    min: 1
  },
  productWeight: {
    type: Number,
  },

  title:{
    type: String,
  },
  price:{
    type: Number,
  },
  afterSale:{
    type: Number,
  },
  images:[{
    type:String,
  }],
  maxLimit:{
    type: Number,
  },
  supplierId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  weight:{
    type: Number,
  },
  desc:{
    type: String,
  },
  unit:{
    type: String,
  },
  subUnit:{
    type: String,
  },
  numberOfSubUnit:{
    type: Number,
  },
  category:{
    type: String,
  },
  supplierType:{
    type: String,
  },
  stock:{
    type: Number,
  }
});

const orderOfferSet = mongoose.Schema({
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer"
  },
  quantity: {
    type: Number,
    min: 1
  },
  offerWeight: {
    type: Number,
  },

  supplierId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  title:{
    type: String,
  },
  image:{
    type: String,
  },
  price:{
    type: Number,
  },
  afterSale:{
    type: Number,
  },
  maxLimit:{
    type: Number,
  },
  stock:{
    type: Number,
  },
  products:{
    type: [orderProductSet]
  },
  desc:{
    type: String,
  }
});

const carSchema = mongoose.Schema({
  type: {
    type: String,
  },
  maxWeight: {
    type: Number,
  },
  image: {
    type: String,
  },
  number: {
    type: String,
  },
});

const orderSchema = mongoose.Schema({
  orderNumber: {
    type: Number,
    unique: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Order should be associated with a supplier']
  },
  customerId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Order should be associated with a customer']
  },
  subTotalPrice: {
    type: Number,
    required: [true, 'Order should have a subTotalPrice']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Order should have a totalPrice']
  },
  tax: {
    type: Number,
    required: [true, 'Order should have a tax']
  },
  address:{
    type: String,
    // required: [true, 'Order should have an address']
  },
  district:{
    type: String,
    // required: [true, 'Order should have a district']
  },
  customerName:{
    type: String,
    // required: [true, 'Order should have a customerName']
  },
  customerPhoneNumber: {
    type: String,
    required: [true, 'Order should have a customerPhoneNumber']
  },
  deliveryFees: {
    type: Number,
  },
  discount: {
    type: Number,
  },
  type:{
    type: String,
    required: [true, 'Order should have a type'],
    enum: ['onDelivery', 'onSite']
  },
  products: {
    type: [orderProductSet],
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDaysNumber: {
    type: Number,
    required: [true, 'Order should have a deliveryDaysNumber']
  },
  status: {
    type: String,
    enum: ['pending', 'complete', 'delivery', 'canceled', 'willBeDelivered', 'inProgress', 'trash','elastic'],
    default: 'pending'
  },
  orderWeight: {
    type: Number,
    // required: [true, 'Order should have a weight']
  },
  offers: [{type:orderOfferSet}],
  longitude:{
    type:Number,
  },
  latitude:{
    type:Number,
  },
  car:{
    type: carSchema
  },
  supplierRating:{
    type: String,
    enum: ['notRating', 'rating', 'ignore'],
    default: 'notRating'
  },
  deliveryBoy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"DeliveryBoy",
  },
  supplierName:{
    type: String,
  },
  supplierType:{
    type: String,
  },
  createdAt:{
    type: Date,
    default: Date.now
  },
  group:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Group",
  }
}, {
  timestamps: true,
});
// Middleware to generate unique order number before saving
orderSchema.pre('save', async function (next) {
  try {
    if (!this.orderNumber) {
      const lastOrder = await this.constructor.findOne().sort({ orderNumber: -1 }).limit(1);
      const newOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;
      this.orderNumber = newOrderNumber;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// orderSchema.pre("save", async function(next) {
//   try {
//     const totalWeight = this.products.reduce((acc, curr) => acc + curr.productWeight, 0);
//     this.orderWeight = totalWeight;
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// orderSchema.pre('save', async function(next) {
//   try {
//     const totalWeight = this.products.reduce((acc, curr) => acc + curr.productWeight, 0);
//     const availableCars = await Car.find({ maxWeight: { $gte: totalWeight } }).sort({ maxWeight: 1 });
//     if (availableCars.length === 0) {
//       throw new Error('No available cars for this weight');
//     }
//     const selectedCar = availableCars[0];
//     this.car = selectedCar._id;
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// const checkMaxWeight = async function (next) {
//   try {
//     const totalWeight = this.products.reduce((acc, curr) => acc + curr.productWeight, 0);
//     const supplier = await Supplier.findById(this.supplierId);
//     if (totalWeight > supplier.maxOrderWeight) {
//       throw new Error('Max Weight Exceeded');
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// const checkMinPrice = async function (next) {
//   try {
//     const totalPrice = this.products.reduce((acc, curr) => acc + curr.totalPrice, 0);
//     const supplier = await Supplier.findById(this.supplierId);
//     if (totalPrice < supplier.minOrderPrice) {
//       throw new Error('Min Price Exceeded');
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// orderSchema.pre('save', checkMaxWeight);
// orderSchema.pre('save', checkMinPrice);

const Order = mongoose.model('Order', orderSchema);
export default Order;
