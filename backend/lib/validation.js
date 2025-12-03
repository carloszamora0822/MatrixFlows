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

/**
 * Validate birthday input
 */
const validateBirthdayInput = ({ firstName, date }) => {
  const errors = {};

  // First name validation
  if (!firstName || !firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (firstName.trim().length > 50) {
    errors.firstName = 'First name must be 50 characters or less';
  }

  // Date validation (MM/DD format)
  if (!date || !date.trim()) {
    errors.date = 'Date is required';
  } else if (!/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date.trim())) {
    errors.date = 'Date must be in MM/DD format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate checkride input
 */
const validateCheckrideInput = ({ time, name, callsign, type, date }) => {
  const errors = {};

  // Time validation (HH:MM format)
  if (!time || !time.trim()) {
    errors.time = 'Time is required';
  } else if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time.trim())) {
    errors.time = 'Time must be in HH:MM format (24-hour)';
  }

  // Name validation
  if (!name || !name.trim()) {
    errors.name = 'Name is required';
  } else if (name.trim().length > 20) {
    errors.name = 'Name must be 20 characters or less';
  }

  // Callsign validation
  if (!callsign || !callsign.trim()) {
    errors.callsign = 'Callsign is required';
  } else if (callsign.trim().length > 10) {
    errors.callsign = 'Callsign must be 10 characters or less';
  }

  // Type validation
  const validTypes = ['PPL', 'IFR', 'COMMERCIAL', 'CFI', 'CFII', 'MEI'];
  if (!type || !type.trim()) {
    errors.type = 'Type is required';
  } else if (!validTypes.includes(type.trim().toUpperCase())) {
    errors.type = `Type must be one of: ${validTypes.join(', ')}`;
  }

  // Date validation (MM/DD format)
  if (!date || !date.trim()) {
    errors.date = 'Date is required';
  } else if (!/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date.trim())) {
    errors.date = 'Date must be in MM/DD format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate event input
 */
const validateEventInput = ({ date, time, description }) => {
  const errors = {};

  // Date validation (MM/DD format)
  if (!date || !date.trim()) {
    errors.date = 'Date is required';
  } else if (!/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date.trim())) {
    errors.date = 'Date must be in MM/DD format';
  }

  // Time validation (HH:MM format)
  if (!time || !time.trim()) {
    errors.time = 'Time is required';
  } else if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time.trim())) {
    errors.time = 'Time must be in HH:MM format (24-hour)';
  }

  // Description validation (16 char limit for Vestaboard display)
  if (!description || !description.trim()) {
    errors.description = 'Description is required';
  } else if (description.trim().length > 16) {
    errors.description = 'Description must be 16 characters or less';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate pilot input
 */
const validatePilotInput = ({ name }) => {
  const errors = {};

  // Name validation
  if (!name || !name.trim()) {
    errors.name = 'Name is required';
  } else if (name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate recognition input
 */
const validateRecognitionInput = ({ firstName, lastName }) => {
  const errors = {};

  // First name validation
  if (!firstName || !firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (firstName.trim().length > 50) {
    errors.firstName = 'First name must be 50 characters or less';
  }

  // Last name validation
  if (!lastName || !lastName.trim()) {
    errors.lastName = 'Last name is required';
  } else if (lastName.trim().length > 50) {
    errors.lastName = 'Last name must be 50 characters or less';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateLoginInput,
  validateUserInput,
  validateBirthdayInput,
  validateCheckrideInput,
  validateEventInput,
  validatePilotInput,
  validateRecognitionInput,
  sanitizeInput,
  createValidationError,
  validateRequired,
  validateLength,
  EMAIL_REGEX,
  PASSWORD_RULES
};
