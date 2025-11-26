const mongoose = require('mongoose');

// Optional model for storing generated documents
// Use this if you want to keep a permanent record of all generated documents

const documentSchema = new mongoose.Schema({
  // Document identification
  documentType: {
    type: String,
    required: true,
    enum: [
      'offer_letter',
      'appointment_letter', 
      'payslip',
      'leave_approval',
      'leave_rejection',
      'experience_certificate',
      'relieving_letter'
    ]
  },
  documentNumber: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness for non-null
  },
  
  // Associated records
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  relatedRecord: {
    // Could be payrollId, leaveId, etc.
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedRecordModel'
  },
  relatedRecordModel: {
    type: String,
    enum: ['Payroll', 'Leave', 'User']
  },
  
  // Document content
  content: {
    type: String, // HTML content
    required: true
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  
  // Metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Document details
  title: String, // e.g., "Appointment Letter - John Doe"
  description: String,
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'generated', 'sent', 'acknowledged'],
    default: 'generated'
  },
  
  // Email tracking (if sent via email)
  sentTo: String, // Email address
  sentAt: Date,
  
  // Download tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: Date,
  
  // Additional data
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Soft delete
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for common queries
documentSchema.index({ employee: 1, documentType: 1, generatedAt: -1 });
documentSchema.index({ generatedAt: -1 });
documentSchema.index({ status: 1 });

// Auto-generate document number
documentSchema.pre('save', async function(next) {
  if (!this.documentNumber) {
    const prefix = this.documentType.toUpperCase().substring(0, 3);
    const count = await this.constructor.countDocuments({ documentType: this.documentType });
    const year = new Date().getFullYear();
    this.documentNumber = `${prefix}/${year}/${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Instance methods
documentSchema.methods.incrementDownloadCount = async function() {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  await this.save();
};

documentSchema.methods.markAsSent = async function(email) {
  this.status = 'sent';
  this.sentTo = email;
  this.sentAt = new Date();
  await this.save();
};

// Static methods
documentSchema.statics.getEmployeeDocuments = async function(employeeId, documentType = null) {
  const query = { employee: employeeId, isActive: true };
  if (documentType) query.documentType = documentType;
  
  return this.find(query)
    .populate('generatedBy', 'fullName')
    .sort({ generatedAt: -1 });
};

documentSchema.statics.getRecentDocuments = async function(limit = 10) {
  return this.find({ isActive: true })
    .populate('employee', 'fullName employeeId')
    .populate('generatedBy', 'fullName')
    .sort({ generatedAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Document', documentSchema);
