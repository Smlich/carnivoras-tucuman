import mongoose from 'mongoose';

const adminAccountSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'primary',
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  passwordHash: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const AdminAccount = mongoose.models.AdminAccount || mongoose.model('AdminAccount', adminAccountSchema);
