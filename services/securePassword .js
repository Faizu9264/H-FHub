const bcrypt = require('bcrypt');

// Function to hash a password securely
const securePassword = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

module.exports = securePassword;
