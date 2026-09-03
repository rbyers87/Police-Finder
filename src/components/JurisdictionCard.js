import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Linking, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function JurisdictionCard({ agency, isPrimary }) {
  const getAgencyIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'city police':
        return 'business';
      case 'county sheriff':
        return 'star';
      case 'state police':
        return 'shield';
      default:
        return 'shield-outline';
    }
  };

  const handlePhoneCall = (phoneNumber) => {
    Alert.alert(
      'Call Non-Emergency Line',
      `Call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL(`tel:${phoneNumber}`)
        }
      ]
    );
  };

  const handleWebsiteOpen = (website) => {
    Linking.openURL(website).catch(() => {
      Alert.alert('Error', 'Unable to open website');
    });
  };

  const handleReportingOpen = (reportingUrl) => {
    Linking.openURL(reportingUrl).catch(() => {
      Alert.alert('Error', 'Unable to open reporting page');
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getAgencyIcon(agency.type)} 
            size={28} 
            color="white" 
          />
        </View>
        
        <View style={styles.agencyInfo}>
          <Text style={styles.agencyName}>{agency.name}</Text>
          <Text style={styles.agencyType}>{agency.type}</Text>
          
          <View style={styles.priorityBadge}>
            {isPrimary ? (
              <View style={styles.primaryBadge}>
                <Ionicons name="star" size={14} color="#28a745" />
                <Text style={styles.primaryBadgeText}>Primary Jurisdiction</Text>
              </View>
            ) : (
              <View style={styles.backupBadge}>
                <Ionicons name="information-circle" size={14} color="#ffc107" />
                <Text style={styles.backupBadgeText}>Backup/County Jurisdiction</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Ionicons name="call" size={18} color="#004080" />
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>Non-Emergency:</Text>
            <Text style={styles.contactValue}>{agency.phone}</Text>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Ionicons name="location" size={18} color="#004080" />
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>Address:</Text>
            <Text style={styles.contactValue}>{agency.address}</Text>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Ionicons name="globe" size={18} color="#004080" />
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>Website:</Text>
            <TouchableOpacity onPress={() => handleWebsiteOpen(agency.website)}>
              <Text style={styles.linkText}>{agency.website}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.callButton]}
          onPress={() => handlePhoneCall(agency.phone)}
        >
          <Ionicons name="call" size={18} color="white" />
          <Text style={styles.buttonText}>Call Non-Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.websiteButton]}
          onPress={() => handleWebsiteOpen(agency.website)}
        >
          <Ionicons name="open" size={18} color="white" />
          <Text style={styles.buttonText}>Visit Website</Text>
        </TouchableOpacity>

        {agency.nonEmergencyReporting && (
          <TouchableOpacity
            style={[styles.button, styles.reportButton]}
            onPress={() => handleReportingOpen(agency.nonEmergencyReporting)}
          >
            <Ionicons name="document-text" size={18} color="white" />
            <Text style={styles.buttonText}>File Report Online</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    backgroundColor: '#004080',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004080',
    marginBottom: 4,
    lineHeight: 24,
  },
  agencyType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  primaryBadgeText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  backupBadgeText: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '600',
  },
  contactInfo: {
    gap: 12,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#004080',
    textDecorationLine: 'underline',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
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
  callButton: {
    backgroundColor: '#28a745',
  },
  websiteButton: {
    backgroundColor: '#004080',
  },
  reportButton: {
    backgroundColor: '#17a2b8',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});