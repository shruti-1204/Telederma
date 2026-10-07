import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { mockPrescriptions } from '../services/mockData';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function PrescriptionScreen({ navigation, route }) {
  const { patient } = useContext(AuthContext);
  
  const initialRx =
    route?.params?.prescription ||
    route?.params?.appointment?.consultation?.prescription ||
    route?.params?.appointment?.prescription ||
    mockPrescriptions[0];

  const [rawRx, setRawRx] = useState(initialRx);
  const [loading, setLoading] = useState(false);
  const [showPostPaymentOptions, setShowPostPaymentOptions] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);

  useEffect(() => {
    const fetchPrescription = async () => {
      const apptId = route?.params?.appointment?.id;
      if (apptId) {
        try {
          setLoading(true);
          const res = await api.get('/prescriptions');
          const allRx = res.data?.data || [];
          const matched = allRx.find(rx => rx.consultation?.appointmentId === apptId);
          if (matched) {
            setRawRx(matched);
          }
        } catch (e) {
          console.warn("Failed to fetch prescription:", e.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchPrescription();
  }, [route?.params?.appointment?.id]);

  useEffect(() => {
    if (shouldPrint && !showPostPaymentOptions && !loading) {
      const timer = setTimeout(() => {
        if (Platform.OS === 'web') {
          window.print();
        } else {
          Alert.alert('PDF', 'PDF download will be supported in native Android build.');
        }
        setShouldPrint(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint, showPostPaymentOptions, loading]);

  const isPaid = rawRx?.consultation?.appointment?.paymentStatus === 'COMPLETED' || route?.params?.isPaid === true || false;

  const handlePayForPrescription = () => {
    setRawRx({ ...rawRx, consultation: { ...rawRx.consultation, appointment: { ...rawRx.consultation?.appointment, paymentStatus: 'COMPLETED' } } });
    setShowPostPaymentOptions(true);
  };

  if (!loading && rawRx && !isPaid) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="e-Prescription Locked" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.primary, marginBottom: 15 }}>Payment Required 🔒</Text>
          <Text style={{ textAlign: 'center', color: Colors.text, marginBottom: 30, fontSize: 16 }}>
            Your consultation is complete. Please pay the consultation fee to view and download your digital prescription.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: Colors.primary, padding: 18, borderRadius: 12, width: '100%', alignItems: 'center', elevation: 3 }}
            onPress={handlePayForPrescription}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Pay Now to Unlock</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showPostPaymentOptions) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Payment Successful" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 40 }}>✅</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46', marginBottom: 10 }}>Payment Done!</Text>
          <Text style={{ textAlign: 'center', color: Colors.text, marginBottom: 40, fontSize: 16 }}>
            Your prescription has been unlocked successfully.
          </Text>
          
          <TouchableOpacity 
            style={{ backgroundColor: Colors.primary, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 15 }}
            onPress={() => {
              setShowPostPaymentOptions(false);
              setShouldPrint(true);
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>View & Auto-Print 📄</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const doctorName =
    rawRx?.doctorName ||
    (rawRx?.doctor?.user?.name
      ? (rawRx.doctor.user.name.startsWith('Dr.') ? rawRx.doctor.user.name : `Dr. ${rawRx.doctor.user.name}`)
      : null) ||
    'Dr. Kundan Ashok Kharde';

  const rxDate = rawRx?.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const medicines = rawRx?.items || rawRx?.medicines || [];
  const notes = rawRx?.notes || 'No additional notes provided.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="e-Prescription" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
           <ActivityIndicator size="large" color={Colors.primary} />
           <Text style={{ marginTop: 10, color: Colors.text }}>Fetching latest prescription...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MedicalDisclaimer />

        {/* Doctor & Patient Info Header */}
        <View style={styles.rxHeaderCard}>
          <Text style={styles.clinicTitle}>Telederma Digital Rx</Text>
          <View style={styles.divider} />
          
          <Text style={styles.docName}>{doctorName}</Text>
          <Text style={styles.docSpec}>Dermatologist, MBBS MD</Text>
          
          <View style={[styles.divider, { marginVertical: 12 }]} />
          
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Patient:</Text>
            <Text style={styles.patientInfoValue}>{patient?.name || 'Gourav Bhatia'}</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Date:</Text>
            <Text style={styles.patientInfoValue}>{rxDate}</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <Text style={styles.patientInfoLabel}>Consult ID:</Text>
            <Text style={styles.patientInfoValue}>{rawRx?.consultationId || rawRx?.id || 'RX-LIVE-101'}</Text>
          </View>
        </View>

        {/* Medicines List */}
        <Text style={styles.sectionTitle}>Prescribed Medicines</Text>
        {medicines.map((med, index) => (
          <View key={index} style={styles.medCard}>
            <Text style={styles.medName}>💊 {med.medicineName || med.name}</Text>
            <View style={styles.medDetailsRow}>
              <View style={styles.medDetailBox}>
                <Text style={styles.medDetailLabel}>Dosage</Text>
                <Text style={styles.medDetailValue}>{med.dosage}</Text>
              </View>
              <View style={styles.medDetailBox}>
                <Text style={styles.medDetailLabel}>Duration</Text>
                <Text style={styles.medDetailValue}>{med.duration}</Text>
              </View>
            </View>
            <View style={styles.medInstructionsBox}>
              <Text style={styles.medInstructionsLabel}>Instructions:</Text>
              <Text style={styles.medInstructionsText}>{med.instructions || 'Take as directed.'}</Text>
            </View>
          </View>
        ))}

        {/* Doctor Notes */}
        <Text style={styles.sectionTitle}>Doctor's Advice & Notes</Text>
        <View style={styles.notesCard}>
          <Text style={styles.notesText}>{notes}</Text>
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16 },
  rxHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  clinicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  docName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center',
  },
  docSpec: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  patientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  patientInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  patientInfoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 10,
  },
  medCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  medDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  medDetailBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  medDetailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  medDetailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  medInstructionsBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  medInstructionsLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
    marginBottom: 4,
  },
  medInstructionsText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  notesCard: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 20,
  },
  notesText: {
    fontSize: 15,
    color: '#166534',
    lineHeight: 22,
  }
});
