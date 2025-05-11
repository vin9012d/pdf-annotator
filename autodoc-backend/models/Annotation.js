const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnnotationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pdf: {
    type: Schema.Types.ObjectId,
    ref: 'PDF',
    required: true
  },
  page: {
    type: Number,
    required: true
  },
  coords: {
    // you can normalize these to 0–1 or keep absolute px
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  comment: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: 'yellow'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

// Auto-set updatedAt
AnnotationSchema.pre('save', function(next) {
  if (!this.isNew) this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Annotation', AnnotationSchema);
