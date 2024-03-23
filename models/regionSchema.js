import mongoose from "mongoose";

const regionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Region should have a name"],
    unique: true,
  },
});

regionSchema.pre('remove', async function(next) {
  const regionId = this._id;
  const suppliers = await mongoose.model('Supplier').findOne({ deliveryRegion: regionId });
  if (suppliers) {
    const err = new Error('Cannot delete region as it is referenced by one or more suppliers.');
    return next(err);
  }
  const deliveryBoys = await mongoose.model('DeliveryBoy').countDocuments({ region: regionId });
  const customers = await mongoose.model('Customer').countDocuments({ region: regionId });
  if (suppliers > 0 || deliveryBoys > 0 || customers > 0) {
    const err = new Error('Cannot delete region as it is referenced by suppliers, delivery boys, or customers.');
    return next(err);
  }
  next();
});

const Region = mongoose.model("Region", regionSchema);
export default Region