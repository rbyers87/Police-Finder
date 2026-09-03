import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocation } from '../context/LocationContext';
import { useJurisdiction } from '../context/JurisdictionContext';
import EmergencyBanner from '../components/EmergencyBanner';
import LocationSection from '../components/LocationSection';
import LocationDisplay from '../components/LocationDisplay';
import JurisdictionCard from '../components/JurisdictionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

export default function HomeScreen() {
  const { 
    location, 
    locationInfo, 
    isLoading, 
    error, 
    getCurrentLocation, 
    geocodeAddress,
    clearLocation 
  } = useLocation();
  
  const { 
    currentJurisdiction, 
    updateJurisdiction, 
    clearJurisdiction 
  } = useJurisdiction();

  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (location) {
      updateJurisdiction(location.coords.latitude, location.coords.longitude);
    }
  }, [location]);

  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      Alert.alert(
        'Location Error',
        error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddressSearch = async () => {
    if (!searchText.trim()) {
      Alert.alert('Search Error', 'Please enter an address to search.');
      return;
    }

    try {
      await geocodeAddress(searchText.trim());
    } catch (error) {
      Alert.alert(
        'Search Error',
        error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearResults = () => {
    clearLocation();
    clearJurisdiction();
    setSearchText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <EmergencyBanner />
        
        <LocationSection
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onGetCurrentLocation={handleGetCurrentLocation}
          onAddressSearch={handleAddressSearch}
          onClearResults={handleClearResults}
          isLoading={isLoading}
        />

        {error && <ErrorDisplay message={error} />}

        {isLoading && <LoadingSpinner />}

        {locationInfo && (
          <LocationDisplay 
            locationInfo={locationInfo}
            onClear={handleClearResults}
          />
        )}

        {currentJurisdiction && (
          <View style={styles.jurisdictionSection}>
            <Text style={styles.sectionTitle}>
              🏛️ Your Law Enforcement Agency
            </Text>
            
            <JurisdictionCard 
              agency={currentJurisdiction.primary}
              isPrimary={true}
            />
            
            {currentJurisdiction.backup && (
              <JurisdictionCard 
                agency={currentJurisdiction.backup}
                isPrimary={false}
              />
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 Texas Law Enforcement Lookup
          </Text>
          <Text style={styles.footerSubtext}>
            Information provided for reference only. Always verify contact information before making important reports.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  jurisdictionSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004080',
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#343a40',
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    color: '#adb5bd',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerSubtext: {
    color: '#adb5bd',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});