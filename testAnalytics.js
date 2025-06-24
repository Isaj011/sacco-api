const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api/v1';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Headers for authenticated requests
const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

// Test analytics endpoints
async function testAnalytics() {
  console.log('🚀 Testing Sacco Analytics System\n');

  try {
    // 1. Test Business Analytics
    console.log('📊 Testing Business Analytics...');
    const businessData = await axios.get(`${BASE_URL}/analytics/business?timeRange=month`, { headers });
    console.log('✅ Business Analytics:', {
      financialMetrics: businessData.data.data.financialMetrics,
      operationalEfficiency: businessData.data.data.operationalEfficiency
    });

    // 2. Test Financial Metrics
    console.log('\n💰 Testing Financial Metrics...');
    const financialData = await axios.get(`${BASE_URL}/analytics/financial?timeRange=month`, { headers });
    console.log('✅ Financial Metrics:', {
      revenue: financialData.data.data.revenue,
      expenses: financialData.data.data.expenses,
      profitability: financialData.data.data.profitability
    });

    // 3. Test Operational Efficiency
    console.log('\n⚡ Testing Operational Efficiency...');
    const operationalData = await axios.get(`${BASE_URL}/analytics/operational`, { headers });
    console.log('✅ Operational Efficiency:', {
      vehicleUtilization: operationalData.data.data.vehicleUtilization,
      routePerformance: operationalData.data.data.routePerformance
    });

    // 4. Test Compliance Data
    console.log('\n🛡️ Testing Compliance Data...');
    const complianceData = await axios.get(`${BASE_URL}/analytics/compliance`, { headers });
    console.log('✅ Compliance Data:', {
      driverCompliance: complianceData.data.data.driverCompliance,
      vehicleCompliance: complianceData.data.data.vehicleCompliance
    });

    // 5. Test Service Quality Metrics
    console.log('\n⭐ Testing Service Quality Metrics...');
    const qualityData = await axios.get(`${BASE_URL}/analytics/service-quality`, { headers });
    console.log('✅ Service Quality:', {
      onTimePerformance: qualityData.data.data.onTimePerformance,
      serviceReliability: qualityData.data.data.serviceReliability,
      passengerSatisfaction: qualityData.data.data.passengerSatisfaction
    });

    // 6. Test Live Operations Data
    console.log('\n📍 Testing Live Operations Data...');
    const liveData = await axios.get(`${BASE_URL}/analytics/live-operations`, { headers });
    console.log('✅ Live Operations:', {
      vehicleTracking: liveData.data.data.vehicleTracking.length,
      trafficConditions: liveData.data.data.trafficConditions,
      performanceMonitoring: liveData.data.data.performanceMonitoring
    });

    // 7. Test Predictive Analytics
    console.log('\n🔮 Testing Predictive Analytics...');
    const predictiveData = await axios.get(`${BASE_URL}/analytics/predictive`, { headers });
    console.log('✅ Predictive Analytics:', {
      maintenancePrediction: predictiveData.data.data.maintenancePrediction.length,
      routeOptimization: predictiveData.data.data.routeOptimization,
      demandForecasting: predictiveData.data.data.demandForecasting
    });

    // 8. Test Executive Dashboard
    console.log('\n📈 Testing Executive Dashboard...');
    const dashboardData = await axios.get(`${BASE_URL}/analytics/dashboard?type=executive&timeRange=month`, { headers });
    console.log('✅ Executive Dashboard:', {
      overview: dashboardData.data.data.overview,
      hasFinancialData: !!dashboardData.data.data.financial,
      hasOperationalData: !!dashboardData.data.data.operational,
      hasComplianceData: !!dashboardData.data.data.compliance
    });

    // 9. Test Real-Time Alerts
    console.log('\n🚨 Testing Real-Time Alerts...');
    const alertsData = await axios.get(`${BASE_URL}/analytics/alerts`, { headers });
    console.log('✅ Real-Time Alerts:', alertsData.data.data);

    // 10. Test Historical Trends
    console.log('\n📊 Testing Historical Trends...');
    const trendsData = await axios.get(`${BASE_URL}/analytics/trends?metric=revenue&timeRange=month`, { headers });
    console.log('✅ Historical Trends:', trendsData.data.data);

    // 11. Test Data Export
    console.log('\n📤 Testing Data Export...');
    const exportData = await axios.get(`${BASE_URL}/analytics/export?type=financial&format=json&timeRange=month`, { headers });
    console.log('✅ Data Export:', {
      exportInfo: exportData.data.exportInfo,
      hasData: !!exportData.data.data
    });

    console.log('\n🎉 All Analytics Tests Completed Successfully!');

  } catch (error) {
    console.error('❌ Error testing analytics:', error.response?.data || error.message);
  }
}

// Test specific analytics functions
async function testSpecificAnalytics() {
  console.log('\n🔍 Testing Specific Analytics Functions...\n');

  try {
    // Test different time ranges
    const timeRanges = ['day', 'week', 'month', 'quarter', 'year'];
    
    for (const range of timeRanges) {
      console.log(`📅 Testing ${range} range...`);
      const data = await axios.get(`${BASE_URL}/analytics/financial?timeRange=${range}`, { headers });
      console.log(`✅ ${range} data received:`, {
        revenue: data.data.data.revenue.total,
        expenses: data.data.data.expenses.total,
        profitMargin: data.data.data.profitability.profitMargin
      });
    }

    // Test different dashboard types
    const dashboardTypes = ['executive', 'operational', 'compliance', 'financial'];
    
    for (const type of dashboardTypes) {
      console.log(`📊 Testing ${type} dashboard...`);
      const data = await axios.get(`${BASE_URL}/analytics/dashboard?type=${type}`, { headers });
      console.log(`✅ ${type} dashboard data received`);
    }

  } catch (error) {
    console.error('❌ Error testing specific analytics:', error.response?.data || error.message);
  }
}

// Test data validation
async function testDataValidation() {
  console.log('\n🔍 Testing Data Validation...\n');

  try {
    // Test invalid time range
    console.log('Testing invalid time range...');
    try {
      await axios.get(`${BASE_URL}/analytics/financial?timeRange=invalid`, { headers });
    } catch (error) {
      console.log('✅ Correctly rejected invalid time range');
    }

    // Test invalid dashboard type
    console.log('Testing invalid dashboard type...');
    try {
      await axios.get(`${BASE_URL}/analytics/dashboard?type=invalid`, { headers });
    } catch (error) {
      console.log('✅ Correctly rejected invalid dashboard type');
    }

    // Test missing required parameters
    console.log('Testing missing parameters...');
    try {
      await axios.get(`${BASE_URL}/analytics/trends`, { headers });
    } catch (error) {
      console.log('✅ Correctly rejected missing metric parameter');
    }

  } catch (error) {
    console.error('❌ Error testing data validation:', error.response?.data || error.message);
  }
}

// Main test execution
async function runAllTests() {
  console.log('🧪 Starting Sacco Analytics System Tests\n');
  
  await testAnalytics();
  await testSpecificAnalytics();
  await testDataValidation();
  
  console.log('\n🏁 All Tests Completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testAnalytics,
  testSpecificAnalytics,
  testDataValidation,
  runAllTests
}; 