// src/utils/formatters.js

/**
 * Format a date string to a readable format
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Format a number as currency (GHS)
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'GHS 0.00';
  
  const num = parseFloat(amount);
  
  if (isNaN(num)) return 'GHS 0.00';
  
  return `GHS ${num.toFixed(2)}`;
};

/**
 * Format a number with commas
 * @param {number|string} number - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  
  const num = parseFloat(number);
  
  if (isNaN(num)) return '0';
  
  return num.toLocaleString('en-US');
};

/**
 * Format percentage
 * @param {number|string} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0%';
  
  const num = parseFloat(value);
  
  if (isNaN(num)) return '0%';
  
  return `${num.toFixed(decimals)}%`;
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now - then) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

/**
 * Calculate profit margin
 * @param {number} cost - Cost price
 * @param {number} selling - Selling price
 * @returns {number} Profit margin percentage
 */
export const calculateProfitMargin = (cost, selling) => {
  if (!cost || !selling) return 0;
  
  const costNum = parseFloat(cost);
  const sellingNum = parseFloat(selling);
  
  if (costNum === 0) return 0;
  
  return ((sellingNum - costNum) / costNum) * 100;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format
 * @param {string} phone - Phone to validate
 * @returns {boolean} Whether phone is valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's 10 digits (adjust based on your country)
  return cleaned.length >= 10;
};

export default {
  formatDate,
  formatCurrency,
  formatNumber,
  formatPercent,
  truncateText,
  formatPhone,
  getRelativeTime,
  calculateProfitMargin,
  isValidEmail,
  isValidPhone,
};