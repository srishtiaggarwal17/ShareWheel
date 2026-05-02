const mongoose = require('mongoose');

// Helper function to validate NITJ email
const isValidNITJEmail = (email) => {
  return email && email.toLowerCase().endsWith('@nitj.ac.in');
};

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: isValidNITJEmail,
      message: 'Only @nitj.ac.in email addresses are allowed. Please use your NITJ email.'
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  totalRides: { 
    type: Number, 
    default: 0,
    min: 0
  },
  totalEarnings: { 
    type: Number, 
    default: 0,
    min: 0
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Optional: Add an index for faster email queries
userSchema.index({ email: 1 });

// Optional: Add a method to check if email is NITJ
userSchema.methods.isNITJEmail = function() {
  return isValidNITJEmail(this.email);
};

module.exports = mongoose.model('User', userSchema);
