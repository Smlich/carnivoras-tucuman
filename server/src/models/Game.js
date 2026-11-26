import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
  },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 400 },
  status: {
    type: String,
    required: true,
    enum: ['coming-soon', 'playable', 'admin-only'],
    default: 'coming-soon',
  },
  requiresAuth: { type: Boolean, default: true },
  requiredProviders: { type: [String], default: ['google'] },
  platform: { type: String, default: 'Google AI Studio', trim: true, maxlength: 80 },
  embedUrl: { type: String, default: null, trim: true },
  adminEmbedUrl: { type: String, default: null, trim: true },
  aspectRatio: { type: String, default: '16 / 9', trim: true, maxlength: 20 },
  badge: { type: String, default: 'Gratis con Google', trim: true, maxlength: 50 },
  adminProps: { type: mongoose.Schema.Types.Mixed, default: {} },
  sortOrder: { type: Number, default: 0, index: true },
}, {
  timestamps: true,
  versionKey: false,
});

export const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);
