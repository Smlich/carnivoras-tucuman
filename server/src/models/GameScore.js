import mongoose from 'mongoose';

const gameScoreSchema = new mongoose.Schema({
  scoreId: { type: String, required: true, unique: true, trim: true },
  gameSlug: { type: String, required: true, lowercase: true, trim: true, index: true },
  playerName: { type: String, required: true, trim: true, maxlength: 100 },
  playerEmail: { type: String, default: '', lowercase: true, trim: true },
  isAdmin: { type: Boolean, default: false },
  score: { type: Number, required: true, min: 0 },
  highScore: { type: Number, required: true, min: 0 },
  maxCombo: { type: Number, default: 0, min: 0 },
  levelReached: { type: Number, default: 1, min: 1 },
  victory: { type: Boolean, default: false },
  elapsedSec: { type: Number, default: 0, min: 0 },
  enemiesDefeated: { type: Number, default: 0, min: 0 },
  damageTaken: { type: Number, default: 0, min: 0 },
  petId: { type: String, default: 'batricio', trim: true },
}, {
  timestamps: true,
  versionKey: false,
});

export const GameScore = mongoose.models.GameScore
  || mongoose.model('GameScore', gameScoreSchema);
