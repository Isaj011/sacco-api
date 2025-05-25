const validateDriverData = (data) => {
  // Required fields validation
  const requiredFields = [
    'driverName',
    'nationalId',
    'contactDetails.phone',
    'driverLicense.number',
    'driverLicense.expiryDate',
    'psvLicense.number',
    'psvLicense.expiryDate'
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      return `${field} is required`;
    }
  }

  // National ID format validation (assuming Kenyan format)
  const nationalIdRegex = /^[0-9]{8}$/;
  if (!nationalIdRegex.test(data.nationalId)) {
    return 'Invalid National ID format';
  }

  // Phone number format validation
  const phoneRegex = /^(\+254|0)[17]\d{8}$/;
  if (!phoneRegex.test(data.contactDetails.phone)) {
    return 'Invalid phone number format';
  }

  // Email format validation (if provided)
  if (data.contactDetails.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactDetails.email)) {
      return 'Invalid email format';
    }
  }

  // License number format validation
  const licenseRegex = /^[A-Z0-9]{8,12}$/;
  if (!licenseRegex.test(data.driverLicense.number)) {
    return 'Invalid driver license number format';
  }
  if (!licenseRegex.test(data.psvLicense.number)) {
    return 'Invalid PSV license number format';
  }

  // Date validations
  const currentDate = new Date();
  
  if (new Date(data.driverLicense.expiryDate) <= currentDate) {
    return 'Driver license has expired';
  }
  
  if (new Date(data.psvLicense.expiryDate) <= currentDate) {
    return 'PSV license has expired';
  }

  if (data.medicalCertificate?.expiryDate && 
      new Date(data.medicalCertificate.expiryDate) <= currentDate) {
    return 'Medical certificate has expired';
  }

  if (data.policeClearance?.expiryDate && 
      new Date(data.policeClearance.expiryDate) <= currentDate) {
    return 'Police clearance has expired';
  }

  // Training certificates validation
  if (data.trainingCertificates) {
    for (const cert of data.trainingCertificates) {
      if (cert.expiryDate && new Date(cert.expiryDate) <= currentDate) {
        return `Training certificate ${cert.certificateType} has expired`;
      }
    }
  }

  // Emergency contacts validation
  if (data.emergencyContacts) {
    for (const contact of data.emergencyContacts) {
      if (contact.isPrimary && !contact.phone) {
        return 'Primary emergency contact must have a phone number';
      }
    }
  }

  // Bank details validation
  if (data.bankDetails) {
    if (data.bankDetails.accountNumber && !/^\d{10,15}$/.test(data.bankDetails.accountNumber)) {
      return 'Invalid bank account number format';
    }
  }

  return null;
};

const validateAssignmentData = (data) => {
  // Required fields validation
  const requiredFields = [
    'employeeId',
    'salary.amount',
    'salary.currency',
    'salary.paymentFrequency',
    'vehicleAssignment.busNumber',
    'vehicleAssignment.routeAssigned',
    'vehicleAssignment.vehicleType',
    'vehicleAssignment.assignmentDate'
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      return `${field} is required`;
    }
  }

  // Salary validation
  if (data.salary.amount <= 0) {
    return 'Salary amount must be greater than 0';
  }

  // Payment frequency validation
  const validFrequencies = ['weekly', 'bi-weekly', 'monthly'];
  if (!validFrequencies.includes(data.salary.paymentFrequency)) {
    return 'Invalid payment frequency';
  }

  // Assignment date validation
  if (new Date(data.vehicleAssignment.assignmentDate) < new Date()) {
    return 'Assignment date cannot be in the past';
  }

  return null;
};

const validateLeaveRequest = (data) => {
  // Required fields validation
  const requiredFields = ['type', 'startDate', 'endDate'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return `${field} is required`;
    }
  }

  // Date validation
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const currentDate = new Date();

  if (startDate < currentDate) {
    return 'Start date cannot be in the past';
  }

  if (endDate < startDate) {
    return 'End date cannot be before start date';
  }

  // Leave type validation
  const validTypes = ['annual', 'sick', 'emergency', 'unpaid'];
  if (!validTypes.includes(data.type)) {
    return 'Invalid leave type';
  }

  return null;
};

const validateDisciplinaryRecord = (data) => {
  // Required fields validation
  const requiredFields = ['date', 'type', 'description', 'action'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return `${field} is required`;
    }
  }

  // Date validation
  if (new Date(data.date) > new Date()) {
    return 'Disciplinary record date cannot be in the future';
  }

  // Type validation
  const validTypes = ['warning', 'suspension', 'termination', 'other'];
  if (!validTypes.includes(data.type)) {
    return 'Invalid disciplinary record type';
  }

  return null;
};

const validateGrievance = (data) => {
  // Required fields validation
  const requiredFields = ['date', 'type', 'description'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return `${field} is required`;
    }
  }

  // Date validation
  if (new Date(data.date) > new Date()) {
    return 'Grievance date cannot be in the future';
  }

  // Type validation
  const validTypes = ['salary', 'working_conditions', 'harassment', 'other'];
  if (!validTypes.includes(data.type)) {
    return 'Invalid grievance type';
  }

  return null;
};

module.exports = {
  validateDriverData,
  validateAssignmentData,
  validateLeaveRequest,
  validateDisciplinaryRecord,
  validateGrievance
}; 