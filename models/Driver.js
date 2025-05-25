const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  // Personal Information
  driverName: { 
    type: String, 
    required: [true, 'Driver name is required'],
    trim: true 
  },
  nationalId: { 
    type: String, 
    required: [true, 'National ID is required'],
    unique: true,
    trim: true
  },
  contactDetails: {
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: { 
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    address: { 
      type: String,
      trim: true
    }
  },
  bloodType: { 
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  medicalConditions: [String],
  allergies: [String],
  photo: {
    url: String,
    uploadDate: Date
  },

  // Documentation & Credentials
  driverLicense: {
    number: { 
      type: String, 
      required: [true, 'Driver license number is required'],
      trim: true
    },
    expiryDate: { 
      type: Date, 
      required: [true, 'Driver license expiry date is required']
    }
  },
  psvLicense: {
    number: { 
      type: String, 
      required: [true, 'PSV license number is required'],
      trim: true
    },
    expiryDate: { 
      type: Date, 
      required: [true, 'PSV license expiry date is required']
    }
  },
  medicalCertificate: {
    expiryDate: Date
  },
  policeClearance: {
    certificateNumber: String,
    issueDate: Date,
    expiryDate: Date,
    documentUrl: String
  },
  trainingCertificates: [{
    certificateType: String,
    issueDate: Date,
    expiryDate: Date,
    documentUrl: String
  }],

  // Contact Information
  emergencyContacts: [{
    name: String,
    relationship: String,
    phone: String,
    isPrimary: Boolean
  }],
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branchCode: String
  },

  // System Fields
  status: {
    type: String,
    enum: ['registered', 'verified', 'assigned', 'active', 'inactive'],
    default: 'registered'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
driverSchema.index({ nationalId: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ 'driverLicense.number': 1 });
driverSchema.index({ 'psvLicense.number': 1 });

// Pre-save middleware to update the updatedAt field
driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if any documents are expiring soon
driverSchema.methods.checkExpiringDocuments = function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDocs = [];
  
  if (this.driverLicense.expiryDate < thirtyDaysFromNow) {
    expiringDocs.push('Driver License');
  }
  if (this.psvLicense.expiryDate < thirtyDaysFromNow) {
    expiringDocs.push('PSV License');
  }
  if (this.medicalCertificate?.expiryDate < thirtyDaysFromNow) {
    expiringDocs.push('Medical Certificate');
  }
  if (this.policeClearance?.expiryDate < thirtyDaysFromNow) {
    expiringDocs.push('Police Clearance');
  }
  
  this.trainingCertificates.forEach(cert => {
    if (cert.expiryDate < thirtyDaysFromNow) {
      expiringDocs.push(`${cert.certificateType} Certificate`);
    }
  });

  return expiringDocs;
};

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver; 