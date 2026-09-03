import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LocationSection({
  searchText,
  onSearchTextChange,
  onGetCurrentLocation,
  onAddressSearch,
  onClearResults,
  isLoading
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Your Location</Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={onGetCurrentLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="locate" size={18} color="white" />
              <Text style={styles.buttonText}>Use My Location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Or enter an address in Texas..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={onSearchTextChange}
            onSubmitEditing={onAddressSearch}
            returnKeyType="search"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onAddressSearch}
            disabled={isLoading}
          >
            <Ionicons name="search" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.clearButton]}
        onPress={onClearResults}
      >
        <Ionicons name="refresh" size={16} color="#666" />
        <Text style={styles.clearButtonText}>Clear Results</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004080',
    flex: 1,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#004080',
    minWidth: 140,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});