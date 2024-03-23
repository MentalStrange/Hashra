import mongoose from "mongoose";

const groupExpireDateSchema = new mongoose.Schema({
  date: {
    type: Number,
    required: true,
  },
});
const GroupExpireDate = mongoose.model("GroupExpireDate", groupExpireDateSchema);
export default GroupExpireDate