import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      setError('Failed to request location permission');
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!locationPermission) {
        const granted = await requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      setLocation(currentLocation);
      
      // Reverse geocode to get readable address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        setLocationInfo({
          city: address.city || 'Unknown City',
          county: address.subAdministrativeArea || 'Unknown County',
          state: address.region || 'TX',
          coordinates: `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`,
          fullAddress: `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim(),
        });
      }

      return currentLocation;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (address) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add Texas to the search if not included
      const searchAddress = address.toLowerCase().includes('texas') || address.toLowerCase().includes('tx') 
        ? address 
        : `${address}, Texas`;

      const geocoded = await Location.geocodeAsync(searchAddress);
      
      if (geocoded.length === 0) {
        throw new Error('Address not found or not in Texas');
      }

      const result = geocoded[0];
      
      // Verify it's in Texas (rough bounds check)
      if (result.latitude < 25.8 || result.latitude > 36.5 || 
          result.longitude < -106.6 || result.longitude > -93.5) {
        throw new Error('Address appears to be outside of Texas');
      }

      const locationData = {
        coords: {
          latitude: result.latitude,
          longitude: result.longitude,
        }
      };

      setLocation(locationData);

      // Reverse geocode to get detailed info
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: result.latitude,
        longitude: result.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addressInfo = reverseGeocode[0];
        setLocationInfo({
          city: addressInfo.city || 'Unknown City',
          county: addressInfo.subAdministrativeArea || 'Unknown County',
          state: addressInfo.region || 'TX',
          coordinates: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
          fullAddress: address,
          isSearchResult: true,
        });
      }

      return locationData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    setLocationInfo(null);
    setError(null);
  };

  const value = {
    location,
    locationPermission,
    isLoading,
    error,
    locationInfo,
    getCurrentLocation,
    geocodeAddress,
    clearLocation,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};