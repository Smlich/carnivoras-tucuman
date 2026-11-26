import mongoose from 'mongoose';

const siteMetricSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  count: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const SiteMetric = mongoose.models.SiteMetric || mongoose.model('SiteMetric', siteMetricSchema);
