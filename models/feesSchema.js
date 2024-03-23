import mongoose  from "mongoose";

const feeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    unique: true,
    enum: ['fee', 'fineForTrash', 'numberOfPendingDaysOrder', 'fineForCancel'],
  }
});

const Fee = mongoose.model("Fee", feeSchema);
export default Fee;