const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';

// Test data
const testUser = {
  email: 'admin@example.com',
  password: '123456'
};

// Helper function to make authenticated requests
async function makeAuthRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

// Test all analytics endpoints
async function testAnalyticsEndpoints() {
  console.log('🚀 Testing Analytics Endpoints...\n');

  // 1. Login to get auth token
  console.log('1. Authenticating...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = loginResponse.data.token;
    console.log('✅ Authentication successful\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return;
  }

  // 2. Test Business Analytics
  console.log('2. Testing Business Analytics...');
  const businessAnalytics = await makeAuthRequest('/analytics/business?timeRange=month');
  console.log(businessAnalytics ? '✅ Business Analytics' : '❌ Business Analytics failed');

  // 3. Test Financial Analytics
  console.log('3. Testing Financial Analytics...');
  const financialAnalytics = await makeAuthRequest('/analytics/financial?timeRange=month');
  console.log(financialAnalytics ? '✅ Financial Analytics' : '❌ Financial Analytics failed');

  // 4. Test Operational Analytics
  console.log('4. Testing Operational Analytics...');
  const operationalAnalytics = await makeAuthRequest('/analytics/operational');
  console.log(operationalAnalytics ? '✅ Operational Analytics' : '❌ Operational Analytics failed');

  // 5. Test Compliance Analytics
  console.log('5. Testing Compliance Analytics...');
  const complianceAnalytics = await makeAuthRequest('/analytics/compliance');
  console.log(complianceAnalytics ? '✅ Compliance Analytics' : '❌ Compliance Analytics failed');

  // 6. Test Service Quality Analytics
  console.log('6. Testing Service Quality Analytics...');
  const serviceQualityAnalytics = await makeAuthRequest('/analytics/service-quality');
  console.log(serviceQualityAnalytics ? '✅ Service Quality Analytics' : '❌ Service Quality Analytics failed');

  // 7. Test Passenger Experience Analytics
  console.log('7. Testing Passenger Experience Analytics...');
  const passengerExperienceAnalytics = await makeAuthRequest('/analytics/passenger-experience');
  console.log(passengerExperienceAnalytics ? '✅ Passenger Experience Analytics' : '❌ Passenger Experience Analytics failed');

  // 8. Test Live Operations Analytics
  console.log('8. Testing Live Operations Analytics...');
  const liveOperationsAnalytics = await makeAuthRequest('/analytics/live-operations');
  console.log(liveOperationsAnalytics ? '✅ Live Operations Analytics' : '❌ Live Operations Analytics failed');

  // 9. Test Predictive Analytics
  console.log('9. Testing Predictive Analytics...');
  const predictiveAnalytics = await makeAuthRequest('/analytics/predictive?timeRange=week');
  console.log(predictiveAnalytics ? '✅ Predictive Analytics' : '❌ Predictive Analytics failed');

  // 10. Test Dashboard Data
  console.log('10. Testing Dashboard Data...');
  const dashboardData = await makeAuthRequest('/analytics/dashboard?type=executive&timeRange=month');
  console.log(dashboardData ? '✅ Dashboard Data' : '❌ Dashboard Data failed');

  // 11. Test Alerts Analytics
  console.log('11. Testing Alerts Analytics...');
  const alertsAnalytics = await makeAuthRequest('/analytics/alerts?status=active');
  console.log(alertsAnalytics ? '✅ Alerts Analytics' : '❌ Alerts Analytics failed');

  // 12. Test Alert Statistics
  console.log('12. Testing Alert Statistics...');
  const alertStats = await makeAuthRequest('/analytics/alerts/stats');
  console.log(alertStats ? '✅ Alert Statistics' : '❌ Alert Statistics failed');

  // 13. Test Historical Trends
  console.log('13. Testing Historical Trends...');
  const historicalTrends = await makeAuthRequest('/analytics/trends?metric=revenue&timeRange=month');
  console.log(historicalTrends ? '✅ Historical Trends' : '❌ Historical Trends failed');

  // 14. Test Demand Analysis
  console.log('14. Testing Demand Analysis...');
  const demandAnalysis = await makeAuthRequest('/analytics/demand-analysis?timeRange=month');
  console.log(demandAnalysis ? '✅ Demand Analysis' : '❌ Demand Analysis failed');

  // 15. Test Risk Assessment
  console.log('15. Testing Risk Assessment...');
  const riskAssessment = await makeAuthRequest('/analytics/risk-assessment?timeRange=month');
  console.log(riskAssessment ? '✅ Risk Assessment' : '❌ Risk Assessment failed');

  // 16. Test Market Intelligence
  console.log('16. Testing Market Intelligence...');
  const marketIntelligence = await makeAuthRequest('/analytics/market-intelligence?timeRange=month');
  console.log(marketIntelligence ? '✅ Market Intelligence' : '❌ Market Intelligence failed');

  // 17. Test Export Analytics
  console.log('17. Testing Export Analytics...');
  const exportAnalytics = await makeAuthRequest('/analytics/export?type=financial&format=json&timeRange=month');
  console.log(exportAnalytics ? '✅ Export Analytics' : '❌ Export Analytics failed');

  console.log('\n🎉 Analytics Endpoints Testing Complete!');
}

// Run the test
testAnalyticsEndpoints().catch(console.error); 