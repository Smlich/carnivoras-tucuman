import mongoose from 'mongoose';

const orderItemSubSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderInquirySchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  customerName: { type: String, default: '', trim: true, maxlength: 80 },
  notes: { type: String, default: '', trim: true, maxlength: 300 },
  items: { type: [orderItemSubSchema], required: true },
  totalARS: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ['nuevo', 'en-proceso', 'confirmado', 'entregado', 'cancelado'],
    default: 'nuevo',
    index: true,
  },
  adminNotes: { type: String, default: '', trim: true, maxlength: 400 },
  source: { type: String, default: 'whatsapp-cart', trim: true, maxlength: 40 },
}, {
  timestamps: true,
  versionKey: false,
});

export const OrderInquiry = mongoose.models.OrderInquiry || mongoose.model('OrderInquiry', orderInquirySchema);
