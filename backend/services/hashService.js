const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

exports.hashPassword = async (plaintext) => {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
};

exports.comparePassword = async (plaintext, hash) => {
  return bcrypt.compare(plaintext, hash);
};