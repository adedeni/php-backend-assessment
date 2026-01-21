const validateItemData = (data) => {
  const errors = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (data.name && data.name.length > 255) {
    errors.push('Name must not exceed 255 characters');
  }
  
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateItemId = (itemId) => {
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    return { isValid: false, errors: ['Invalid item ID'] };
  }
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(itemId)) {
    return { isValid: false, errors: ['Item ID must be a valid UUID v4'] };
  }
  
  return { isValid: true, errors: [] };
};

module.exports = { validateItemData, validateItemId };