import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  contentType: {
    type: String,
    required: true,
    enum: ['image/png', 'image/jpeg', 'image/webp'],
  },
  filename: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  data: {
    type: Buffer,
    required: true,
  },
  size: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const MediaAsset = mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
