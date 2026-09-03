import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LocationDisplay({ locationInfo, onClear }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {locationInfo.isSearchResult ? '🔍 Search Result' : '📍 Current Location'}
        </Text>
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.locationName}>
          {locationInfo.fullAddress || `${locationInfo.city}, ${locationInfo.county}`}
        </Text>
        
        <Text style={styles.locationDetails}>
          {locationInfo.city}, {locationInfo.county}, {locationInfo.state}
        </Text>
        
        <View style={styles.coordinatesContainer}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.coordinates}>
            {locationInfo.coordinates}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e8f4fd',
    borderWidth: 1,
    borderColor: '#004080',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004080',
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    gap: 8,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#004080',
    lineHeight: 24,
  },
  locationDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  coordinates: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
});