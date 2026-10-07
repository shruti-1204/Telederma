import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { mockDoctors } from '../services/mockData';
import { socketService } from '../services/socketService';
import api from '../services/api';

export default function DoctorProfileScreen({ navigation, route }) {
  const incomingDoctor = route?.params?.doctor || mockDoctors[0];
  const [doctor, setDoctor] = useState(incomingDoctor);

  useEffect(() => {
    socketService.connect();

    // Fetch freshest doctor record from backend
    const fetchLive = async () => {
      try {
        if (!incomingDoctor?.id) return;
        const res = await api.get(`/doctors/${incomingDoctor.id}`);
        if (res.data?.data) {
          setDoctor((prev) => ({
            ...prev,
            ...res.data.data,
            availableSlots: res.data.data.availableSlots || prev.availableSlots,
          }));
        }
      } catch (_) {}
    };
    fetchLive();

    const unsub = socketService.on('doctor:updated', (updated) => {
      if (updated && (updated.id === incomingDoctor.id || updated.userId === incomingDoctor.userId)) {
        setDoctor((prev) => ({
          ...prev,
          ...updated,
          availableSlots: updated.availableSlots || prev.availableSlots,
        }));
      }
    });

    return () => unsub();
  }, [incomingDoctor?.id]);

  const initials = doctor.name
    ? doctor.name
        .replace('Dr. ', '')
        .split(' ')
        .map((w) => w[0])
        .join('')
    : 'DR';

  const hospitalName = doctor.hospital || doctor.hospitalClinic || 'TeleDerma Telehealth Network';
  const expertise = doctor.expertiseAreas || 'Acne, Eczema, Psoriasis, General Dermatology';
  const duration = doctor.consultationDuration || '20 mins';
  const slots = doctor.availableSlots || '09:00 AM - 01:00 PM, 04:00 PM - 08:00 PM';
  const languagesList = Array.isArray(doctor.languages)
    ? doctor.languages.join(', ')
    : doctor.languages || 'English, Hindi';

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Link */}
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to Doctors List</Text>
        </TouchableOpacity>

        {/* Doctor Header Card */}
        <View style={styles.profileCard}>
          {doctor.avatar ? (
            <Image
              source={{ uri: doctor.avatar }}
              style={styles.avatarBigImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarBig}>
              <Text style={styles.avatarBigText}>{initials}</Text>
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.docName}>{doctor.name}</Text>
            {doctor.verified && <Text style={styles.verifiedTag}>✓ Verified</Text>}
          </View>
          <Text style={styles.docQual}>{doctor.qualification}</Text>
          <Text style={styles.docSpec}>{doctor.specialization}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>⭐ {doctor.rating || 4.9}</Text>
              <Text style={styles.statLbl}>{doctor.reviewsCount || 150} reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{doctor.experience} Yrs</Text>
              <Text style={styles.statLbl}>Experience</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>₹{doctor.fee}</Text>
              <Text style={styles.statLbl}>Consult Fee</Text>
            </View>
          </View>
        </View>

        {/* About Biography */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About Doctor</Text>
          <Text style={styles.bioText}>{doctor.about}</Text>
        </View>

        {/* Professional Expertise & Qualifications */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Professional Information & Expertise</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Specialization:</Text>
            <Text style={styles.infoValue}>{doctor.specialization}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Qualifications:</Text>
            <Text style={styles.infoValue}>{doctor.qualification}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Areas of Expertise:</Text>
            <Text style={styles.infoValue}>{expertise}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Consultation Duration:</Text>
            <Text style={styles.infoValue}>{duration}</Text>
          </View>
        </View>

        {/* Practice Hospital & Languages */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Clinical Practice & Languages</Text>
          <Text style={styles.subItem}>🏥 {hospitalName}</Text>
          <Text style={styles.subItem}>🗣️ Languages: {languagesList}</Text>
        </View>

        {/* Available Dates & Time Slots */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Upcoming Availability & Slots</Text>
          <Text style={styles.slotDetailText}>🕒 Working Hours / Slots: {slots}</Text>
          {doctor.availableDates && doctor.availableDates.length > 0 && (
            <View style={styles.datesRow}>
              {doctor.availableDates.map((date, idx) => (
                <View key={idx} style={styles.datePill}>
                  <Text style={styles.datePillText}>📅 {date}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Book Consultation CTA Button */}
        <TouchableOpacity
          style={styles.bookCtaBtn}
          onPress={() => navigation.navigate('BookAppointment', { doctor })}
          activeOpacity={0.8}
        >
          <Text style={styles.bookCtaBtnText}>Proceed to Slot Selection (₹{doctor.fee}) ➔</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backRow: {
    marginBottom: 10,
  },
  backText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBigImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 12,
  },
  avatarBigText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  docName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  verifiedTag: {
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '700',
  },
  docQual: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  docSpec: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  statLbl: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 20,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '600',
  },
  subItem: {
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: 6,
  },
  slotDetailText: {
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: 10,
    fontWeight: '500',
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePill: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  bookCtaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
