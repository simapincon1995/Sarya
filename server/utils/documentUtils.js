/**
 * Utility functions for document generation
 */

// Format number as currency (Indian Rupees)
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Convert number to words (Indian numbering system)
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one ? ' ' + ones[one] : '');
    }
    
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder ? ' ' + convertLessThanThousand(remainder) : '');
  }
  
  // Handle negative numbers
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));
  
  // Round to 2 decimal places
  num = Math.round(num * 100) / 100;
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = '';
  
  if (rupees === 0) {
    result = 'Zero Rupees';
  } else {
    // Indian numbering system: crore, lakh, thousand
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;
    
    if (crore) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder) result += convertLessThanThousand(remainder);
    
    result = result.trim() + ' Rupees';
  }
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result.trim() + ' Only';
}

// Calculate tax based on Indian tax slabs (Old Regime for simplicity)
function calculateTax(annualIncome) {
  if (annualIncome <= 250000) return 0;
  
  let tax = 0;
  
  // 5% on income between 2.5L to 5L
  if (annualIncome > 250000) {
    const taxableAmount = Math.min(annualIncome - 250000, 250000);
    tax += taxableAmount * 0.05;
  }
  
  // 20% on income between 5L to 10L
  if (annualIncome > 500000) {
    const taxableAmount = Math.min(annualIncome - 500000, 500000);
    tax += taxableAmount * 0.20;
  }
  
  // 30% on income above 10L
  if (annualIncome > 1000000) {
    const taxableAmount = annualIncome - 1000000;
    tax += taxableAmount * 0.30;
  }
  
  // Add 4% cess
  tax = tax + (tax * 0.04);
  
  return Math.round(tax);
}

// Calculate monthly tax
function calculateMonthlyTax(monthlySalary) {
  const annualIncome = monthlySalary * 12;
  const annualTax = calculateTax(annualIncome);
  return Math.round(annualTax / 12);
}

// Format date in various formats
function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD MMM YYYY':
      return `${day} ${monthShort[d.getMonth()]} ${year}`;
    case 'DD MMMM YYYY':
      return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'MMMM DD, YYYY':
      return `${monthNames[d.getMonth()]} ${day}, ${year}`;
    default:
      return d.toLocaleDateString('en-IN');
  }
}

// Get month name
function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
}

// Calculate experience duration
function calculateExperience(startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years === 0 && months === 0) {
    return 'Less than 1 month';
  } else if (years === 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  } else if (months === 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else {
    return `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`;
  }
}

// Calculate probation end date
function calculateProbationEnd(joiningDate, probationMonths = 3) {
  const date = new Date(joiningDate);
  date.setMonth(date.getMonth() + probationMonths);
  return date;
}

// Sanitize HTML content for security
function sanitizeHTML(html) {
  if (!html) return '';
  
  // Basic sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
}

// Generate unique document number
function generateDocumentNumber(prefix = 'DOC') {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}/${year}${month}${day}/${random}`;
}

// Calculate PF (Provident Fund) - 12% of basic salary
function calculatePF(basicSalary) {
  return Math.round(basicSalary * 0.12);
}

// Calculate ESI (Employee State Insurance) - 0.75% of gross salary
function calculateESI(grossSalary) {
  // ESI applicable only if gross salary is less than or equal to 21,000 per month
  if (grossSalary > 21000) return 0;
  return Math.round(grossSalary * 0.0075);
}

// Calculate HRA (House Rent Allowance) - typically 40-50% of basic salary
function calculateHRA(basicSalary, percentage = 40) {
  return Math.round(basicSalary * (percentage / 100));
}

// Standard medical allowance (usually fixed)
function getMedicalAllowance() {
  return 1250;
}

// Standard transport allowance (usually fixed)
function getTransportAllowance() {
  return 1600;
}

// Calculate overtime amount
function calculateOvertime(overtimeHours, basicSalary, workingDaysPerMonth = 26, hoursPerDay = 8) {
  const hourlyRate = basicSalary / (workingDaysPerMonth * hoursPerDay);
  const overtimeRate = hourlyRate * 1.5; // 1.5x regular rate
  return Math.round(overtimeHours * overtimeRate);
}

// Render template with data
function renderTemplate(templateContent, data) {
  if (!templateContent) return '';
  
  let rendered = templateContent;
  
  // Replace all {{variable}} placeholders with actual data
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const value = data[key] !== undefined && data[key] !== null ? data[key] : '';
    rendered = rendered.replace(regex, value);
  });
  
  // Remove any remaining unreplaced placeholders
  rendered = rendered.replace(/{{[^}]+}}/g, '');
  
  return rendered;
}

module.exports = {
  formatCurrency,
  numberToWords,
  calculateTax,
  calculateMonthlyTax,
  formatDate,
  getMonthName,
  calculateExperience,
  calculateProbationEnd,
  sanitizeHTML,
  generateDocumentNumber,
  calculatePF,
  calculateESI,
  calculateHRA,
  getMedicalAllowance,
  getTransportAllowance,
  calculateOvertime,
  renderTemplate
};
