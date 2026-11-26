import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  scientificName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  priceARS: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isSafeInteger,
      message: 'El precio debe expresarse como un número entero de pesos.',
    },
  },
  category: {
    type: String,
    required: true,
    enum: ['combos', 'otras', 'venus', 'especiales'],
    index: true,
  },
  categoryLabel: {
    type: String,
    required: true,
    trim: true,
    maxlength: 40,
  },
  image: {
    type: String,
    required: true,
    trim: true,
  },
  imageAlt: {
    type: String,
    required: true,
    trim: true,
    maxlength: 240,
  },
  catalogNote: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  },
  stockStatus: {
    type: String,
    enum: ['ask', 'available', 'unavailable'],
    default: 'ask',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  versionKey: false,
});

productSchema.index({ isActive: 1, category: 1, sortOrder: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
