// middleware/emailValidator.js
const isValidNITJEmail = (email) => {
  return email && email.toLowerCase().endsWith('@nitj.ac.in');
};

const validateNITJEmail = (req, res, next) => {
  const email = req.body.email;
  
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  
  if (!isValidNITJEmail(email)) {
    return res.status(400).json({ 
      message: "Only @nitj.ac.in email addresses are allowed" 
    });
  }
  
  // Normalize email to lowercase
  req.body.email = email.toLowerCase();
  next();
};

module.exports = { isValidNITJEmail, validateNITJEmail };
