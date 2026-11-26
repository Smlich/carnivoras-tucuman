import mongoose from 'mongoose';

const galleryItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
  },
  src: { type: String, required: true, trim: true },
  width: { type: Number, default: 960, min: 100, max: 6000 },
  height: { type: Number, default: 1280, min: 100, max: 6000 },
  label: { type: String, required: true, trim: true, maxlength: 60 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 320 },
  alt: { type: String, required: true, trim: true, maxlength: 240 },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0, index: true },
}, {
  timestamps: true,
  versionKey: false,
});

export const GalleryItem = mongoose.models.GalleryItem || mongoose.model('GalleryItem', galleryItemSchema);
