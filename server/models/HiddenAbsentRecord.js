const mongoose = require('mongoose');

const hiddenAbsentRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  hiddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hiddenAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Unique index to prevent duplicate hidden records for same employee on same date
hiddenAbsentRecordSchema.index({ employee: 1, date: 1 }, { unique: true });
hiddenAbsentRecordSchema.index({ date: 1 });

module.exports = mongoose.model('HiddenAbsentRecord', hiddenAbsentRecordSchema);

