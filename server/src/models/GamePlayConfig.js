import mongoose from 'mongoose';

const gamePlayConfigSchema = new mongoose.Schema({
  gameSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  updatedBy: { type: String, default: '' },
}, {
  timestamps: true,
  versionKey: false,
});

export const GamePlayConfig = mongoose.models.GamePlayConfig
  || mongoose.model('GamePlayConfig', gamePlayConfigSchema);
