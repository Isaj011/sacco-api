const generateEmployeeId = async (DriverAssignment) => {
  const prefix = 'EMP';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Find the latest employee ID
  const latestAssignment = await DriverAssignment.findOne()
    .sort({ employeeId: -1 })
    .select('employeeId');
  
  let sequence = 1;
  if (latestAssignment && latestAssignment.employeeId) {
    // Extract the sequence number from the latest ID
    const latestSequence = parseInt(latestAssignment.employeeId.slice(-4));
    sequence = latestSequence + 1;
  }
  
  // Format: EMP-YY-XXXX (e.g., EMP-24-0001)
  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
};

module.exports = {
  generateEmployeeId
}; 