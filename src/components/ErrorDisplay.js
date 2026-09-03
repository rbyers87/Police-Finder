import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ErrorDisplay({ message }) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={24} color="#dc3545" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  message: {
    flex: 1,
    color: '#721c24',
    fontSize: 14,
    lineHeight: 20,
  },
});