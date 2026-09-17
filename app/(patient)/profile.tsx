import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { subscribePatientData } from '../../src/(patient)/patientService';

export default function PatientProfileScreen() {
  const router = useRouter();
  
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const patientUid = "spCRyTr79TaIAPDQMQLN6t1keqg2"; 

  useEffect(() => {
    const unsubscribe = subscribePatientData(patientUid, (data) => {
      if (data) {
        setPatientData(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        if (data.profileImage) {
          setProfileImage(data.profileImage);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to pick image from library or camera
  const handlePickImage = async () => {
    if (!isEditing) {
      Alert.alert("Notice", "Please click 'Edit Profile' first to change your profile picture.");
      return;
    }

    Alert.alert(
      "Update Profile Picture",
      "Choose a source",
      [
        {
          text: "Camera",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
              Alert.alert("Permission Denied", "Camera permission is required to take a photo.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
              setProfileImage(result.assets[0].uri);
            }
          },
        },
        {
          text: "Photo Library",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
              Alert.alert("Permission Denied", "Gallery permission is required to select a photo.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
              setProfileImage(result.assets[0].uri);
            }
          },
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleSave = () => {
    // Here you would typically save changes (including profileImage URI or base64) to your database/backend
    setIsEditing(false);
    Alert.alert("Success", "Profile updated successfully!");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Profile</Text>
        <TouchableOpacity 
          style={styles.editToggleButton} 
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.editToggleText}>{isEditing ? "Save" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loaderText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            {/* Customizable Profile Picture Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={handlePickImage}
                style={styles.avatarContainer}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#0D9488" />
                  </View>
                )}
                
                {/* Camera Badge Overlay */}
                {isEditing && (
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              
              <Text style={styles.profileNameText}>{name || "Patient"}</Text>
              <Text style={styles.profileSubText}>
                {isEditing ? "Tap photo to change avatar" : `UID: ${patientUid.substring(0, 10)}...`}
              </Text>
            </View>

            {/* Personal Information Form Card */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Personal Information</Text>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={name}
                onChangeText={setName}
                editable={isEditing}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                placeholder="Enter phone number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={[styles.cardSectionTitle, { marginTop: 20 }]}>Pregnancy Details</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pregnancy Week</Text>
                <Text style={styles.infoValue}>{patientData?.pregnancyWeek || 0} Weeks</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated Due Date (EDD)</Text>
                <Text style={styles.infoValue}>{patientData?.edd || "N/A"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Type</Text>
                <Text style={styles.infoValue}>{patientData?.bloodType || "N/A"}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  editToggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0D9488',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    color: '#64748B',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});