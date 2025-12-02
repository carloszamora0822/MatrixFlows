const { ERROR_CODES } = require('../../shared/constants');

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation rules
 */
const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < PASSWORD_RULES.minLength) {
    return { 
      isValid: false, 
      message: `Password must be at least ${PASSWORD_RULES.minLength} characters long` 
    };
  }
  
  if (password.length > PASSWORD_RULES.maxLength) {
    return { 
      isValid: false, 
      message: `Password must be less than ${PASSWORD_RULES.maxLength} characters long` 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate login input
 */
const validateLoginInput = ({ email, password }) => {
  const errors = {};

  // Email validation
  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate user creation input
 */
const validateUserInput = ({ email, password, role }) => {
  const errors = {};

  // Email validation
  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message;
    }
  }

  // Role validation
  if (role && !['admin', 'editor', 'viewer'].includes(role)) {
    errors.role = 'Invalid role. Must be admin, editor, or viewer';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input.trim();
};

/**
 * Create validation error response
 */
const createValidationError = (errors, message = 'Validation failed') => {
  return {
    error: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message,
      details: {
        fieldErrors: errors
      }
    }
  };
};

/**
 * Validate required fields
 */
const validateRequired = (data, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field} is required`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate string length
 */
const validateLength = (value, min = 0, max = Infinity, fieldName = 'Field') => {
  if (typeof value !== 'string') {
    return { isValid: false, message: `${fieldName} must be a string` };
  }
  
  const length = value.trim().length;
  
  if (length < min) {
    return { isValid: false, message: `${fieldName} must be at least ${min} characters` };
  }
  
  if (length > max) {
    return { isValid: false, message: `${fieldName} must be no more than ${max} characters` };
  }
  
  return { isValid: true };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateLoginInput,
  validateUserInput,
  sanitizeInput,
  createValidationError,
  validateRequired,
  validateLength,
  EMAIL_REGEX,
  PASSWORD_RULES
};
