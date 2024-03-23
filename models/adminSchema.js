import mongoose from "mongoose";

const adminSchema =  mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Admin should have a name'],
  },
  email: {
    type: String,
    unique: [true, 'Admin should have a unique email'], 
    match: /^\S+@\S+\.\S+$/, 
    required: [true, 'Admin should have an email'],
  },
  password: {
    type: String,
    required: [true, 'Admin should have a password'],
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

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
