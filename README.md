# Texas Law Enforcement Lookup - React Native App

A React Native mobile application that helps users find their local law enforcement agency based on their GPS location or a searched address in Texas.

## Features

- **GPS Location Detection**: Uses device location services to determine user's current position
- **Address Search**: Manual address input with geocoding for Texas locations
- **Jurisdiction Matching**: Implements city-first, county-second hierarchy matching Texas law enforcement structure
- **Agency Information**: Displays contact details, addresses, and websites for law enforcement agencies
- **Direct Calling**: One-tap calling to non-emergency numbers
- **Emergency Disclaimer**: Clear messaging that this is not for emergencies (call 911)
- **Offline Support**: Works with cached jurisdiction data

## Technical Implementation

### Architecture
- **React Native with Expo**: Cross-platform mobile development
- **Context API**: State management for location and jurisdiction data
- **Expo Location**: Native GPS and geocoding services
- **React Navigation**: Screen navigation and routing

### Key Components
- `LocationContext`: Manages GPS location and geocoding
- `JurisdictionContext`: Handles jurisdiction matching logic
- `JurisdictionCard`: Displays law enforcement agency information
- `LocationSection`: GPS and search interface
- `EmergencyBanner`: Safety disclaimer

### Jurisdiction Logic
1. **City Priority**: If location is within city limits, city police have primary jurisdiction
2. **County Backup**: County sheriff serves as backup for city locations
3. **County Primary**: For unincorporated areas, county sheriff has primary jurisdiction
4. **State Fallback**: Texas DPS for areas without specific local jurisdiction

## Installation

### Prerequisites
- Node.js 16+ and npm
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (Mac) or Android Studio (for testing)

### Setup
```bash
# Clone and install dependencies
cd texas-law-enforcement
npm install

# Start development server
npm start

# Run on specific platform
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

### Device Testing
```bash
# Install Expo Go app on your phone
# Scan QR code from terminal to test on device
npm start
```

## Data Integration

### Current Implementation
- Mock jurisdiction data for major Texas cities and counties
- Simulated boundary checking using lat/lng ranges
- Sample law enforcement agencies with real contact information

### Production Implementation
To use real Texas GIS data:

1. **Download Boundary Data**
   - Texas city limits: https://gis-txdot.opendata.arcgis.com/
   - County boundaries: Texas Secretary of State GIS data
   - Convert to GeoJSON format

2. **Implement Point-in-Polygon**
   ```javascript
   // Use libraries like @turf/boolean-point-in-polygon
   import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
   
   const isInJurisdiction = booleanPointInPolygon(
     [longitude, latitude], 
     jurisdictionPolygon
   );
   ```

3. **Update Context Logic**
   - Replace mock bounds checking with real polygon matching
   - Add comprehensive Texas jurisdiction database
   - Implement proper city/county hierarchy

## Permissions

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access to determine which law enforcement agency has jurisdiction in your area.</string>
```

### Android (app.json)
```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION"
]
```

## Building for Production

### iOS
```bash
# Build for App Store
expo build:ios --type archive

# Or use EAS Build (recommended)
npm install -g @expo/eas-cli
eas build --platform ios
```

### Android
```bash
# Build APK
expo build:android --type apk

# Build AAB for Play Store
expo build:android --type app-bundle

# Or use EAS Build
eas build --platform android
```

## Deployment Considerations

### App Store Requirements
- Privacy policy for location data usage
- Clear explanation of law enforcement lookup purpose
- Compliance with emergency services guidelines

### Legal Considerations
- Disclaimer about information accuracy
- Clear emergency vs. non-emergency distinction
- Regular updates to jurisdiction data

### Performance Optimization
- Implement jurisdiction data caching
- Optimize polygon matching algorithms
- Add offline functionality for cached areas

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues or questions:
- Create GitHub issue for bugs
- Check documentation for implementation details
- Contact maintainers for jurisdiction data questions

---

**Important**: This app is designed for non-emergency use only. For emergencies, always dial 911.

I've created a complete React Native app for Texas Law Enforcement Jurisdiction Lookup using Expo. This app implements all the features you requested:

Key Features:

GPS Location Detection using Expo Location services
Address Search with geocoding for Texas locations
Jurisdiction Matching with city-first, county-second hierarchy
Law Enforcement Contact Info with direct calling capability
Emergency Disclaimer prominently displayed
Professional Mobile UI optimized for emergency situations
Technical Highlights:

Context-based Architecture for clean state management
Native Location Services with proper permissions
Cross-platform Compatibility (iOS and Android)
Responsive Design with Texas-themed styling
Error Handling for location and search failures
Jurisdiction Logic:

City police have primary jurisdiction within city limits
County sheriff serves as backup for cities or primary for unincorporated areas
Texas DPS as fallback for areas without local jurisdiction
The app is now running and ready for testing. You can:

Test on iOS Simulator, Android Emulator, or web browser
Install Expo Go on your phone and scan the QR code for device testing
Build production apps for App Store and Google Play Store
To integrate real Texas GIS data from the TxDOT portal you mentioned, you'll need to:

Download the boundary shapefiles
Convert to GeoJSON format
Replace the mock jurisdiction data with real polygon boundaries
Implement proper point-in-polygon algorithms using libraries like Turf.js
The app structure is designed to easily accommodate real GIS data when you're ready to integrate it.