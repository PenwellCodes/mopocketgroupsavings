const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional - Firebase handles passwords
  phoneNumber: { type: String, required: true }, 
  role: { type: String, default: "user" },
  firebaseUID: { type: String, required: true, unique: true } // Link to Firebase Auth - unique creates index automatically
});

// Create explicit index on firebaseUID (unique already creates an index, but this ensures it's properly indexed)
userSchema.index({ firebaseUID: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
