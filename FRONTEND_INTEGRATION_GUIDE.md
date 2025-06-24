# Frontend Integration Guide - Sacco Analytics System

This guide explains how to integrate the comprehensive analytics system into your frontend application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# For React applications
npm install axios socket.io-client recharts @mui/material @emotion/react @emotion/styled

# For Vue applications
npm install axios socket.io-client vue-chartjs chart.js

# For Angular applications
npm install @angular/common @angular/core socket.io-client chart.js
```

### 2. Setup API Configuration

```javascript
// config/api.js
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

export default API_CONFIG;
```

### 3. Setup Authentication

```javascript
// services/auth.js
import axios from "axios";
import API_CONFIG from "../config/api";

const authService = {
  setToken: (token) => {
    localStorage.setItem("authToken", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  },

  getToken: () => {
    return localStorage.getItem("authToken");
  },

  removeToken: () => {
    localStorage.removeItem("authToken");
    delete axios.defaults.headers.common["Authorization"];
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },
};

export default authService;
```

## 📊 Analytics Service Integration

### 1. Create Analytics Service

```javascript
// services/analyticsService.js
import axios from "axios";
import API_CONFIG from "../config/api";

class AnalyticsService {
  constructor() {
    this.api = axios.create(API_CONFIG);
  }

  // Business Analytics
  async getBusinessAnalytics(timeRange = "month") {
    const response = await this.api.get(
      `/analytics/business?timeRange=${timeRange}`
    );
    return response.data;
  }

  async getFinancialMetrics(timeRange = "month") {
    const response = await this.api.get(
      `/analytics/financial?timeRange=${timeRange}`
    );
    return response.data;
  }

  async getOperationalEfficiency() {
    const response = await this.api.get("/analytics/operational");
    return response.data;
  }

  // Compliance Data
  async getComplianceData() {
    const response = await this.api.get("/analytics/compliance");
    return response.data;
  }

  async getServiceQualityMetrics() {
    const response = await this.api.get("/analytics/service-quality");
    return response.data;
  }

  async getPassengerExperience() {
    const response = await this.api.get("/analytics/passenger-experience");
    return response.data;
  }

  // Real-time Data
  async getLiveOperationsData() {
    const response = await this.api.get("/analytics/live-operations");
    return response.data;
  }

  async getPredictiveAnalytics() {
    const response = await this.api.get("/analytics/predictive");
    return response.data;
  }

  // Dashboards
  async getDashboardData(type = "executive", timeRange = "month") {
    const response = await this.api.get(
      `/analytics/dashboard?type=${type}&timeRange=${timeRange}`
    );
    return response.data;
  }

  // Alerts and Trends
  async getRealTimeAlerts() {
    const response = await this.api.get("/analytics/alerts");
    return response.data;
  }

  async getHistoricalTrends(metric, timeRange = "month") {
    const response = await this.api.get(
      `/analytics/trends?metric=${metric}&timeRange=${timeRange}`
    );
    return response.data;
  }

  // Data Export
  async exportAnalytics(type, format = "json", timeRange = "month") {
    const response = await this.api.get(
      `/analytics/export?type=${type}&format=${format}&timeRange=${timeRange}`,
      {
        responseType: format === "csv" ? "blob" : "json",
      }
    );
    return response.data;
  }
}

export default new AnalyticsService();
```

### 2. Real-time WebSocket Integration

```javascript
// services/realtimeService.js
import io from "socket.io-client";
import authService from "./auth";

class RealtimeService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    const token = authService.getToken();
    if (!token) return;

    this.socket = io(process.env.REACT_APP_WS_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  setupEventListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to real-time service");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from real-time service");
    });

    this.socket.on("analytics_update", (data) => {
      this.notifyCallbacks("analytics_update", data);
    });

    this.socket.on("alert", (alert) => {
      this.notifyCallbacks("alert", alert);
    });

    this.socket.on("vehicle_update", (data) => {
      this.notifyCallbacks("vehicle_update", data);
    });

    this.socket.on("incident", (incident) => {
      this.notifyCallbacks("incident", incident);
    });
  }

  subscribe(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  unsubscribe(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyCallbacks(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach((callback) => callback(data));
    }
  }
}

export default new RealtimeService();
```

## 🎨 React Components

### 1. Executive Dashboard Component

```jsx
// components/ExecutiveDashboard.jsx
import React, { useState, useEffect } from "react";
import { Grid, Card, CardContent, Typography, Box } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import analyticsService from "../services/analyticsService";

const ExecutiveDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getDashboardData(
        "executive",
        "month"
      );
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Executive Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Vehicles
              </Typography>
              <Typography variant="h4">
                {data.overview?.totalVehicles || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Vehicles
              </Typography>
              <Typography variant="h4">
                {data.overview?.activeVehicles || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Drivers
              </Typography>
              <Typography variant="h4">
                {data.overview?.totalDrivers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Routes
              </Typography>
              <Typography variant="h4">
                {data.overview?.totalRoutes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financial Overview
              </Typography>
              <Typography variant="h4" color="primary">
                KES {data.financial?.revenue?.total?.toLocaleString() || 0}
              </Typography>
              <Typography color="textSecondary">
                Total Revenue (This Month)
              </Typography>
              <Typography variant="h6" color="success.main">
                {data.financial?.profitability?.profitMargin?.toFixed(1) || 0}%
                Profit Margin
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Operational Efficiency */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Operational Efficiency
              </Typography>
              <Typography variant="h4" color="primary">
                {data.operational?.vehicleUtilization?.utilizationRate?.toFixed(
                  1
                ) || 0}
                %
              </Typography>
              <Typography color="textSecondary">
                Vehicle Utilization Rate
              </Typography>
              <Typography variant="h6" color="info.main">
                {data.operational?.vehicleUtilization?.capacityUtilization?.toFixed(
                  1
                ) || 0}
                % Capacity Utilization
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Trend Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={
                    data.financial?.trends?.monthlyRevenue?.map(
                      (value, index) => ({
                        month: `Month ${index + 1}`,
                        revenue: value,
                      })
                    ) || []
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;
```

### 2. Live Operations Monitor

```jsx
// components/LiveOperationsMonitor.jsx
import React, { useState, useEffect } from "react";
import { Grid, Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import analyticsService from "../services/analyticsService";
import realtimeService from "../services/realtimeService";

const LiveOperationsMonitor = () => {
  const [liveData, setLiveData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadLiveData();
    setupRealtimeUpdates();

    const interval = setInterval(loadLiveData, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      realtimeService.disconnect();
    };
  }, []);

  const loadLiveData = async () => {
    try {
      const response = await analyticsService.getLiveOperationsData();
      setLiveData(response.data);
    } catch (error) {
      console.error("Error loading live data:", error);
    }
  };

  const setupRealtimeUpdates = () => {
    realtimeService.connect();

    realtimeService.subscribe("vehicle_update", (data) => {
      setLiveData((prev) => ({
        ...prev,
        vehicleTracking: prev.vehicleTracking.map((vehicle) =>
          vehicle.vehicleId === data.vehicleId
            ? { ...vehicle, ...data }
            : vehicle
        ),
      }));
    });

    realtimeService.subscribe("alert", (alert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Live Operations Monitor
      </Typography>

      <Grid container spacing={3}>
        {/* Vehicle Tracking Map */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vehicle Locations
              </Typography>
              <Box sx={{ height: 400 }}>
                <MapContainer
                  center={[-1.2921, 36.8219]} // Nairobi coordinates
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {liveData?.vehicleTracking?.map((vehicle) => (
                    <Marker
                      key={vehicle.vehicleId}
                      position={[
                        vehicle.location.latitude,
                        vehicle.location.longitude,
                      ]}
                    >
                      <Popup>
                        <Typography variant="subtitle2">
                          {vehicle.plateNumber}
                        </Typography>
                        <Typography variant="body2">
                          Speed: {vehicle.speed} km/h
                        </Typography>
                        <Typography variant="body2">
                          Status: {vehicle.status}
                        </Typography>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Metrics */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Live Metrics
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {liveData?.performanceMonitoring?.activeVehicles || 0}
                  </Typography>
                  <Typography color="textSecondary">Active Vehicles</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Traffic Conditions
                  </Typography>
                  <Chip
                    label={
                      liveData?.trafficConditions?.congestionLevel || "Unknown"
                    }
                    color={
                      liveData?.trafficConditions?.congestionLevel === "High"
                        ? "error"
                        : "success"
                    }
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Avg Speed: {liveData?.trafficConditions?.averageSpeed || 0}{" "}
                    km/h
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Weather
                  </Typography>
                  <Typography variant="h6">
                    {liveData?.weatherIntegration?.condition || "Unknown"}
                  </Typography>
                  <Typography variant="body2">
                    {liveData?.weatherIntegration?.temperature || 0}°C
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Real-time Alerts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Real-time Alerts
              </Typography>
              {alerts.length === 0 ? (
                <Typography color="textSecondary">No active alerts</Typography>
              ) : (
                alerts.map((alert, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 1,
                      p: 1,
                      border: "1px solid #ddd",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" color="error">
                      {alert.type}
                    </Typography>
                    <Typography variant="body2">{alert.message}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(alert.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveOperationsMonitor;
```

### 3. Compliance Dashboard

```jsx
// components/ComplianceDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import analyticsService from "../services/analyticsService";

const ComplianceDashboard = () => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getComplianceData();
      setComplianceData(response.data);
    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading compliance data...</div>;
  if (!complianceData) return <div>No compliance data available</div>;

  const driverComplianceData = [
    {
      name: "Compliant",
      value: complianceData.driverCompliance.complianceScore,
      color: "#4caf50",
    },
    {
      name: "Non-Compliant",
      value: 100 - complianceData.driverCompliance.complianceScore,
      color: "#f44336",
    },
  ];

  const vehicleComplianceData = [
    {
      name: "Compliant",
      value: complianceData.vehicleCompliance.complianceScore,
      color: "#4caf50",
    },
    {
      name: "Non-Compliant",
      value: 100 - complianceData.vehicleCompliance.complianceScore,
      color: "#f44336",
    },
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Compliance Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Driver Compliance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Driver Compliance
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={driverComplianceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {driverComplianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="h4" align="center" color="primary">
                {complianceData.driverCompliance.complianceScore.toFixed(1)}%
              </Typography>
              <Typography align="center" color="textSecondary">
                Compliance Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Vehicle Compliance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vehicle Compliance
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleComplianceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {vehicleComplianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="h4" align="center" color="primary">
                {complianceData.vehicleCompliance.complianceScore.toFixed(1)}%
              </Typography>
              <Typography align="center" color="textSecondary">
                Compliance Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Licenses */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expiring Driver Licenses
              </Typography>
              {complianceData.driverCompliance.expiringLicenses.length === 0 ? (
                <Alert severity="success">No licenses expiring soon</Alert>
              ) : (
                <List>
                  {complianceData.driverCompliance.expiringLicenses.map(
                    (license, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={license.driverName}
                          secondary={`${license.licenseNumber} - Expires in ${license.daysUntilExpiry} days`}
                        />
                      </ListItem>
                    )
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Insurance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expiring Vehicle Insurance
              </Typography>
              {complianceData.vehicleCompliance.expiringInsurance.length ===
              0 ? (
                <Alert severity="success">No insurance expiring soon</Alert>
              ) : (
                <List>
                  {complianceData.vehicleCompliance.expiringInsurance.map(
                    (insurance, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={insurance.plateNumber}
                          secondary={`Expires in ${insurance.daysUntilExpiry} days`}
                        />
                      </ListItem>
                    )
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComplianceDashboard;
```

## 🔧 Advanced Features

### 1. Data Export Functionality

```jsx
// components/DataExport.jsx
import React, { useState } from "react";
import {
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import analyticsService from "../services/analyticsService";

const DataExport = () => {
  const [exportType, setExportType] = useState("financial");
  const [format, setFormat] = useState("json");
  const [timeRange, setTimeRange] = useState("month");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = await analyticsService.exportAnalytics(
        exportType,
        format,
        timeRange
      );

      if (format === "csv") {
        // Handle CSV download
        const blob = new Blob([data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exportType}_analytics_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exportType}_analytics_${
          new Date().toISOString().split("T")[0]
        }.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Export Type</InputLabel>
        <Select
          value={exportType}
          label="Export Type"
          onChange={(e) => setExportType(e.target.value)}
        >
          <MenuItem value="financial">Financial</MenuItem>
          <MenuItem value="operational">Operational</MenuItem>
          <MenuItem value="compliance">Compliance</MenuItem>
          <MenuItem value="service-quality">Service Quality</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Format</InputLabel>
        <Select
          value={format}
          label="Format"
          onChange={(e) => setFormat(e.target.value)}
        >
          <MenuItem value="json">JSON</MenuItem>
          <MenuItem value="csv">CSV</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Time Range</InputLabel>
        <Select
          value={timeRange}
          label="Time Range"
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <MenuItem value="day">Day</MenuItem>
          <MenuItem value="week">Week</MenuItem>
          <MenuItem value="month">Month</MenuItem>
          <MenuItem value="quarter">Quarter</MenuItem>
          <MenuItem value="year">Year</MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleExport}
        disabled={exporting}
        sx={{ m: 1 }}
      >
        {exporting ? "Exporting..." : "Export Data"}
      </Button>
    </Box>
  );
};

export default DataExport;
```

### 2. Custom Hooks for Analytics

```javascript
// hooks/useAnalytics.js
import { useState, useEffect } from "react";
import analyticsService from "../services/analyticsService";

export const useAnalytics = (endpoint, params = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [endpoint, JSON.stringify(params)]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (endpoint) {
        case "business":
          response = await analyticsService.getBusinessAnalytics(
            params.timeRange
          );
          break;
        case "financial":
          response = await analyticsService.getFinancialMetrics(
            params.timeRange
          );
          break;
        case "operational":
          response = await analyticsService.getOperationalEfficiency();
          break;
        case "compliance":
          response = await analyticsService.getComplianceData();
          break;
        case "live-operations":
          response = await analyticsService.getLiveOperationsData();
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadData();
  };

  return { data, loading, error, refresh };
};

export const useRealtimeAnalytics = () => {
  const [updates, setUpdates] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const handleUpdate = (data) => {
      setUpdates((prev) => [data, ...prev.slice(0, 49)]); // Keep last 50 updates
    };

    const handleAlert = (alert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    };

    realtimeService.subscribe("analytics_update", handleUpdate);
    realtimeService.subscribe("alert", handleAlert);

    return () => {
      realtimeService.unsubscribe("analytics_update", handleUpdate);
      realtimeService.unsubscribe("alert", handleAlert);
    };
  }, []);

  return { updates, alerts };
};
```

## 🎯 Best Practices

### 1. Error Handling

```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    switch (error.response.status) {
      case 401:
        // Handle unauthorized
        authService.removeToken();
        window.location.href = "/login";
        break;
      case 403:
        // Handle forbidden
        return "You do not have permission to access this resource";
      case 404:
        // Handle not found
        return "The requested resource was not found";
      case 500:
        // Handle server error
        return "An internal server error occurred";
      default:
        return error.response.data?.message || "An error occurred";
    }
  } else if (error.request) {
    // Network error
    return "Network error. Please check your connection.";
  } else {
    // Other error
    return error.message || "An unexpected error occurred";
  }
};
```

### 2. Loading States

```jsx
// components/LoadingSpinner.jsx
import React from "react";
import { CircularProgress, Box, Typography } from "@mui/material";

const LoadingSpinner = ({ message = "Loading..." }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
  >
    <CircularProgress />
    <Typography variant="body2" sx={{ mt: 2 }}>
      {message}
    </Typography>
  </Box>
);

export default LoadingSpinner;
```

### 3. Data Caching

```javascript
// utils/cache.js
class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const analyticsCache = new AnalyticsCache();
```

This comprehensive frontend integration guide provides everything needed to build a powerful analytics dashboard for the Sacco management system. The components are modular, reusable, and follow React best practices for state management and performance optimization.
