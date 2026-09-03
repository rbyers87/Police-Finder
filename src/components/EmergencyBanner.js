import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmergencyBanner() {
  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={32} color="#ffd700" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>FOR EMERGENCIES, DIAL 9-1-1</Text>
        <Text style={styles.subtitle}>
          This service is for non-emergency contact information only
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#dc3545',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#dc3545',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
});