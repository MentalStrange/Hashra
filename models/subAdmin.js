import mongoose from "mongoose";

const subAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "SubAdmin should have a name"],
  },
  email: {
    type: String,
    required: [true, "SubAdmin should have an email"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "SubAdmin should have a password"],
  },
  phone: {
    type: String,
    required: [true, "SubAdmin should have a phone"],
    unique: true,
  },
  address: {
    type: String,
  },
  image: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const SubAdmin = mongoose.model("SubAdmin", subAdminSchema);
export default SubAdmin;