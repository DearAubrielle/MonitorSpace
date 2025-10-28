# MonitorSpace - Data Center Monitoring System

## Project Abstract

### Overview
Many organizations prioritize the security of their data centers, as the potential loss of information could result in millions of dollars in damages. To prevent abnormal situations and security breaches, MonitorSpace utilizes a combination of IoT technologies and software programming to secure and monitor data center environments in real-time.

### Objectives
The primary objective of this project is to enhance data center security measures and provide comprehensive monitoring capabilities through a web-based application integrated with Grafana visualization. The system employs IoT sensors to continuously monitor critical parameters including temperature, lighting conditions, door access, and energy levels in switchboard cabinets. 

Real-time notifications are delivered via email and the Line messaging application to alert relevant personnel of any anomalies or critical conditions that require immediate attention. This project aims to improve data center security by utilizing IoT sensors to detect and display information on websites, thereby increasing accuracy and frequency beyond what human inspectors could achieve.

### System Architecture
MonitorSpace is built on a modern, scalable architecture consisting of:

1. **IoT Sensor Network**
   - Temperature sensors for environmental monitoring
   - Gas detection sensors for safety monitoring
   - Camera systems with AI-powered human fall detection (YOLOv8)
   - Door and access control sensors
   - Energy consumption monitors for switchboard cabinets

2. **Backend Infrastructure**
   - Node.js/Express server with RESTful API architecture
   - MySQL database for data persistence and historical analytics
   - MQTT protocol for real-time sensor data communication
   - WebSocket support for live data streaming
   - JWT-based authentication and role-based access control (RBAC)

3. **Frontend Application**
   - React with TypeScript for type-safe development
   - Vite for optimized build performance
   - Real-time dashboard with interactive floor plans
   - Device management interface
   - Team member management with granular permissions

4. **Integration Services**
   - Grafana for advanced data visualization and analytics
   - Line Messaging API for instant mobile notifications
   - Email notification system for critical alerts
   - AI-powered camera analysis using YOLOv8 for fall detection

### Key Features

#### Real-Time Monitoring
- Continuous monitoring of temperature, gas levels, and other critical parameters
- Live camera feeds with AI-powered anomaly detection
- Interactive floor plan visualization with device status indicators
- Real-time alerts when sensor values exceed defined thresholds

#### Advanced Security
- Role-based permission system (Administrator, Manager, Operator, Viewer)
- Granular access control for different system features
- Secure authentication with JWT tokens
- API rate limiting and security middleware

#### Intelligent Alerting
- Multi-channel notification system (Email + Line app)
- Configurable alert thresholds for each sensor
- Human fall detection with automatic alerts
- Alert cooldown mechanisms to prevent notification flooding

#### Data Visualization
- Grafana integration for historical data analysis
- Real-time charts and graphs
- Floor plan-based device positioning
- Historical trend analysis and reporting

### Technical Implementation

#### IoT Sensor Integration
The system uses MQTT protocol to receive real-time data from distributed IoT sensors. Each sensor is configured with customizable alert thresholds (minimum and maximum values). When sensor readings fall outside the acceptable range, the system automatically triggers notifications to designated personnel.

#### AI-Powered Surveillance
The camera monitoring system incorporates YOLOv8 object detection models to identify potential safety hazards, particularly human falls in the data center. The system analyzes video streams in real-time and sends immediate alerts via Line messaging when a fall is detected.

#### Permission Management
A comprehensive role-based access control system ensures that users only have access to features appropriate to their role:
- **Administrator**: Full system access including user management and system settings
- **Manager**: Device and member management capabilities
- **Operator**: View and basic device management functions
- **Viewer**: Read-only access to dashboards and device information

### Benefits and Impact

1. **Enhanced Security**: Continuous 24/7 monitoring with immediate alerting capabilities far exceeds manual inspection intervals.
2. **Improved Accuracy**: IoT sensors provide precise, consistent measurements eliminating human error.
3. **Increased Response Time**: Real-time notifications enable rapid response to critical situations.
4. **Data-Driven Decisions**: Historical data analysis helps identify trends and optimize operations.
5. **Scalability**: Modular architecture allows easy addition of new sensors and monitoring locations.
6. **Cost Efficiency**: Automated monitoring reduces the need for constant manual inspection.
7. **Safety Enhancement**: AI-powered fall detection improves personnel safety in the data center.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Modern component-based architecture

**Backend:**
- Node.js with Express framework
- MySQL database
- MQTT messaging protocol
- WebSocket for real-time communication

**IoT & AI:**
- Python for sensor integration
- YOLOv8 for object detection
- OpenCV for video processing
- MoveNet for pose estimation

**Integration:**
- Grafana for visualization
- Line Messaging API
- Email notification services

### Conclusion

MonitorSpace represents a comprehensive solution for modern data center security and monitoring. By combining IoT sensor technology with advanced software development, AI-powered analytics, and multi-channel notification systems, the project ensures the safety and proper operation of critical data center equipment. The system significantly increases monitoring accuracy and frequency beyond what human inspectors could achieve, while providing actionable insights through intuitive web interfaces and real-time alerting mechanisms. This project demonstrates the effective integration of IoT, web technologies, and AI to solve real-world infrastructure monitoring challenges.
