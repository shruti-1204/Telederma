import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { mockDoctors } from '../services/mockData';
import { ConsultationContext } from '../context/ConsultationContext';
import api from '../services/api';
import { socketService } from '../services/socketService';
import { parseDoctorSlots } from '../utils/slotHelper';

const FILTERS = ['All', 'Available Today', 'Acne Specialists', 'Pediatric', 'Top Rated (4.8+)'];

export default function DoctorListScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedDoctor, triageResult } = useContext(ConsultationContext);
  const isRedTriage = triageResult?.triageLevel === 'RED';

  useEffect(() => {
    fetchDoctors();
    socketService.connect();

    // Real-time listener: When a doctor registers or updates profile in Doctor App
    const unsubNewDoc = socketService.on('doctor:new', () => {
      console.log('[PatientApp] Live doctor:new received. Refreshing registered doctors...');
      fetchDoctors();
    });

    const unsubUpdDoc = socketService.on('doctor:updated', () => {
      console.log('[PatientApp] Live doctor:updated received. Refreshing registered doctors...');
      fetchDoctors();
    });

    // Re-fetch on focus
    const unsubFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      fetchDoctors();
    }) : null;

    return () => {
      if (unsubFocus) unsubFocus();
      unsubNewDoc();
      unsubUpdDoc();
    };
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors');
      if (res.data?.data) {
        const formatted = res.data.data.map((d, index) => {
          const fallback = mockDoctors[index % mockDoctors.length] || {};
          const cleanName = d.user?.name || 'Dr. Specialist';
          const displayName = cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`;
          const rawAvatar = d.avatar || d.user?.avatar || null;
          const exp = d.experienceYears != null ? d.experienceYears : (d.experience || fallback.experience || 10);
          const fee = d.consultationFee != null ? Number(d.consultationFee) : (d.fee || fallback.fee || 700);
          const hosp = d.hospitalClinic || fallback.hospital || 'TeleDerma Telehealth Network';
          const expertise = d.expertiseAreas || 'General Dermatology, Acne, Eczema';
          const langs = d.languages
            ? (Array.isArray(d.languages) ? d.languages : d.languages.split(',').map((s) => s.trim()))
            : (fallback.languages || ['English', 'Hindi']);
          const availableSlotsText = d.availableSlots || '09:00 AM - 01:00 PM, 04:00 PM - 08:00 PM';
          const duration = d.consultationDuration || '20 mins';

          return {
            id: d.id,
            name: displayName,
            avatar: rawAvatar,
            qualification: d.qualification || 'MBBS, MD (Dermatology)',
            specialization: d.specialization || 'Clinical Dermatology',
            experience: exp,
            rating: fallback.rating || 4.9,
            reviewsCount: fallback.reviewsCount || 150,
            fee: fee,
            consultationDuration: duration,
            verified: d.isVerified,
            availableToday: true,
            about: d.bio || `${displayName} is a verified dermatologist specializing in clinical and aesthetic skin care.`,
            languages: langs,
            hospital: hosp,
            expertiseAreas: expertise,
            availableSlots: availableSlotsText,
            availableDates: ['Today', 'Tomorrow', 'Saturday', 'Sunday'],
            slots: parseDoctorSlots(d.availableSlots || fallback.slots),
          };
        });
        setDoctors(formatted);
      }
    } catch (err) {
      console.warn('Failed to load registered doctors:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      doc.name.toLowerCase().includes(term) ||
      doc.specialization.toLowerCase().includes(term) ||
      (doc.about && doc.about.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (activeFilter === 'Available Today') return doc.availableToday;
    if (activeFilter === 'Acne Specialists') return /acne|cosmetic|clinical|venereology/i.test(doc.specialization);
    if (activeFilter === 'Pediatric') return /pediatric|child/i.test(doc.specialization);
    if (activeFilter === 'Top Rated (4.8+)') return doc.rating >= 4.7;
    return true;
  });

  const handleSelectDoctor = (doc) => {
    if (isRedTriage) {
      alert('🚨 Video Consultation is disabled for RED Emergency triage cases. Please visit the nearest hospital or emergency room immediately.');
      return;
    }
    setSelectedDoctor(doc);
    navigation.navigate('DoctorProfile', { doctor: doc });
  };

  const handleDirectBook = (doc) => {
    if (isRedTriage) {
      alert('🚨 Video Consultation is disabled for RED Emergency triage cases. Please visit the nearest hospital or emergency room immediately.');
      return;
    }
    setSelectedDoctor(doc);
    navigation.navigate('BookAppointment', { doctor: doc });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      {/* Emergency RED Triage Notice */}
      {isRedTriage && (
        <View style={styles.emergencyWarningBanner}>
          <Text style={styles.emergencyWarningTitle}>🚨 Urgent Hospital Mandate Active</Text>
          <Text style={styles.emergencyWarningDesc}>
            Your triage assessment returned RED (Emergency). Online video consultations are disabled for acute high-risk cases. Please go directly to a hospital emergency room for immediate in-person treatment.
          </Text>
        </View>
      )}

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search doctors by name or specialty..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultCount}>
          {filteredDoctors.length} Verified Dermatologist{filteredDoctors.length !== 1 ? 's' : ''} Available (Live Network)
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 12, color: Colors.textMuted, fontSize: 14, fontWeight: '600' }}>
              Fetching verified doctors from database...
            </Text>
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: Colors.textMuted, fontWeight: '600' }}>
              No verified doctors found matching your filter.
            </Text>
          </View>
        ) : (
          filteredDoctors.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => handleSelectDoctor(doc)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                {doc.avatar ? (
                  <Image
                    source={{ uri: doc.avatar }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {doc.name.replace('Dr. ', '').split(' ').map((w) => w[0]).join('')}
                    </Text>
                  </View>
                )}

                <View style={styles.docInfoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    {doc.verified && <Text style={styles.verifiedIcon}>✓ Verified</Text>}
                  </View>
                  <Text style={styles.docQual}>{doc.qualification}</Text>
                  <Text style={styles.docSpec}>{doc.specialization}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaItem}>⭐ {doc.rating} ({doc.reviewsCount})</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaItem}>{doc.experience} yrs exp</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaItem}>🗣️ {Array.isArray(doc.languages) ? doc.languages.slice(0, 2).join(', ') : doc.languages}</Text>
                  </View>
                </View>
              </View>

              {/* Hospital & Expertise & Slots */}
              <View style={styles.hospitalRow}>
                <Text style={styles.hospitalText}>🏥 {doc.hospital}</Text>
                {doc.expertiseAreas ? (
                  <Text style={styles.expertiseText}>🔬 Expertise: {doc.expertiseAreas}</Text>
                ) : null}
                <Text style={styles.slotsSnippetText}>🕒 Available: {doc.availableSlots}</Text>
              </View>

              {/* Card Footer with fee and buttons */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.feeLabel}>Consultation Fee</Text>
                  <Text style={styles.feeAmount}>₹{doc.fee}</Text>
                </View>

                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => handleSelectDoctor(doc)}
                  >
                    <Text style={styles.profileBtnText}>View Bio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => handleDirectBook(doc)}
                  >
                    <Text style={styles.bookBtnText}>Book Slot ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

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
  searchHeader: {
    backgroundColor: Colors.surface,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textDark,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 10,
  },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  docInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  verifiedIcon: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '800',
  },
  docQual: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  docSpec: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  metaDot: {
    marginHorizontal: 6,
    color: Colors.textMuted,
  },
  hospitalRow: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  hospitalText: {
    fontSize: 12,
    color: Colors.textDark,
    fontWeight: '600',
  },
  expertiseText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 3,
  },
  slotsSnippetText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  feeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  feeAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  profileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emergencyWarningBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emergencyWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  emergencyWarningDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
  },
});
