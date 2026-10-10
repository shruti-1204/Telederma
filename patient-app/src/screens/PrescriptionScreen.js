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
  Image,
  Linking,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { mockPrescriptions } from '../services/mockData';
import { AuthContext } from '../context/AuthContext';
import { socketService } from '../services/socketService';
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

  // Direct UPI Payment States
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);
  const [isPaymentClaimed, setIsPaymentClaimed] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

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

  const isPaid =
    rawRx?.isUnlocked === true ||
    rawRx?.consultation?.appointment?.paymentStatus === 'COMPLETED' ||
    route?.params?.isPaid === true ||
    false;

  useEffect(() => {
    const apptId = route?.params?.appointment?.id || rawRx?.consultation?.appointmentId || rawRx?.appointmentId;
    if (apptId && !isPaid) {
      fetchPaymentDetails(apptId);
    }
  }, [route?.params?.appointment?.id, rawRx?.id, isPaid]);

  const fetchPaymentDetails = async (targetId) => {
    try {
      setLoadingPaymentDetails(true);
      const res = await api.get(`/payments/doctor-upi/${targetId}`);
      if (res.data?.data) {
        setPaymentDetails(res.data.data);
        if (res.data.data.isUnlocked) {
          setRawRx((prev) => ({ ...prev, isUnlocked: true }));
        }
      }
    } catch (e) {
      console.warn('Failed to load doctor payment details:', e.message);
    } finally {
      setLoadingPaymentDetails(false);
    }
  };

  useEffect(() => {
    const unsubConfirmed = socketService.on('payment:confirmed', () => {
      setRawRx((prev) => ({ ...prev, isUnlocked: true }));
      setIsPaymentClaimed(false);
    });
    const unsubUnlocked = socketService.on('prescription:unlocked', (unlockedData) => {
      setRawRx(unlockedData);
      setIsPaymentClaimed(false);
    });
    return () => {
      unsubConfirmed();
      unsubUnlocked();
    };
  }, []);

  
  const generatePdf = async () => {
    try {
      const pName = patient?.user?.name || patient?.name || 'Unknown Patient';
      const pAge = patient?.age || 'N/A';
      const pGender = patient?.gender || 'N/A';
      const docNamePdf = rawRx?.doctorName || (rawRx?.doctor?.user?.name ? (rawRx.doctor.user.name.startsWith('Dr.') ? rawRx.doctor.user.name : `Dr. ${rawRx.doctor.user.name}`) : 'Doctor');
      const rxDatePdf = rawRx?.date || new Date().toLocaleDateString('en-IN');
      const medsHtml = (rawRx?.items || rawRx?.medicines || []).map(m => `
        <tr><td><strong>${m.name || m.medicine}</strong></td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration || 'As prescribed'}</td></tr>
      `).join('');
      const notesPdf = rawRx?.notes || 'No additional notes provided.';

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
                * { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
              body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; padding: 40px; color: #111; line-height: 1.6; }
              .header { display: flex; justify-content: space-between; border-bottom: 3px solid #047857; padding-bottom: 20px; }
              .logo { font-size: 32px; font-weight: bold; color: #047857; letter-spacing: 1px; }
              .doc-details { text-align: right; }
              .patient-details { margin: 30px 0; display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
              .rx-symbol { font-size: 48px; font-weight: bold; color: #1e293b; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
              th { background-color: #f1f5f9; font-weight: bold; }
              .notes { margin-top: 30px; background: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; }
              .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div><div class="logo">TeleDerma</div><div>Digital Dermatology Clinic</div></div>
              <div class="doc-details"><h3>${docNamePdf}</h3><div>Dermatologist, MBBS MD</div><div>Reg: MC-12345</div></div>
            </div>
            <div class="patient-details">
              <div><strong>Patient Name:</strong> ${pName}<br><strong>Age / Gender:</strong> ${pAge} / ${pGender}</div>
              <div style="text-align: right;"><strong>Date:</strong> ${rxDatePdf}<br><strong>Rx ID:</strong> #${rawRx?.id || 'RX-001'}</div>
            </div>
            <div class="rx-symbol" style="font-style: italic;">Rx</div>
            <table><tr><th>Medicine Name</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>${medsHtml}</table>
            ${notesPdf ? `<div class="notes"><div><strong>Doctor's Advice:</strong></div><div>${notesPdf}</div></div>` : ''}
            <div class="footer"><p>This is a digitally generated e-prescription. Valid for online pharmacy dispensing.</p><p>Generated via TeleDerma Platform at ${new Date().toLocaleString()}</p></div>
          </body>
        </html>
      `;
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (err) {
      Alert.alert("Error", "Could not generate PDF");
    }
  };

  const handleCopyUpi = () => {
    const upi = paymentDetails?.upiId || 'dr.kundan@upi';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(upi);
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  

  const handleClaimPayment = async () => {
    try {
      setIsSubmittingClaim(true);
      const apptId = route?.params?.appointment?.id || rawRx?.consultation?.appointmentId || rawRx?.appointmentId || paymentDetails?.appointmentId;
      const cId = rawRx?.consultationId || paymentDetails?.consultationId;

      await api.post('/payments/claim-paid', {
        appointmentId: apptId,
        consultationId: cId,
        amount: paymentDetails?.consultationFee || 700,
      });

      setIsPaymentClaimed(true);
      Alert.alert(
        'Payment Claim Sent! 🔔',
        `Doctor has been notified in real time. Once verified, this prescription will unlock immediately.`
      );
    } catch (err) {
      Alert.alert('Notice', err.response?.data?.message || 'Failed to submit payment claim.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (!loading && rawRx && !isPaid) {
    const docName =
      paymentDetails?.doctorName ||
      rawRx?.doctorName ||
      (rawRx?.doctor?.user?.name
        ? (rawRx.doctor.user.name.startsWith('Dr.') ? rawRx.doctor.user.name : `Dr. ${rawRx.doctor.user.name}`)
        : 'Doctor');
    const fee = paymentDetails?.consultationFee || 700;
    const upi = paymentDetails?.upiId || 'dr.kundan@upi';
    const upiString = paymentDetails?.upiPayString || `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(docName)}&am=${fee.toFixed(2)}&cu=INR&tn=TeleDerma%20Consultation%20Fee`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiString)}`;

    return (
      <SafeAreaView style={styles.safeArea}>
        <Header navigation={navigation} />
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 30 }}>🔒</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 6, textAlign: 'center' }}>
            Payment Required to Unlock Rx
          </Text>
          <Text style={{ textAlign: 'center', color: '#64748B', marginBottom: 20, fontSize: 13, lineHeight: 18 }}>
            Please complete direct UPI payment to {docName} to view and download your full prescription.
          </Text>

          {/* Details Card */}
          <View style={{ width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>👨‍⚕️ Doctor</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{docName}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>💵 Consultation Fee</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F766E' }}>₹{fee}</Text>
            </View>

            {/* UPI ID */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, color: '#0F766E', fontWeight: '600' }}>🆔 Doctor UPI ID</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#134E4A' }}>{upi}</Text>
              </View>
              <TouchableOpacity onPress={handleCopyUpi} style={{ backgroundColor: '#0F766E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{copiedUpi ? '✓ Copied' : '📋 Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            <View style={{ alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>📲 Auto-Generated UPI QR Code</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>Scan with GPay, PhonePe, Paytm, or BHIM</Text>
              <Image source={{ uri: qrUrl }} style={{ width: 180, height: 180, borderRadius: 8 }} resizeMode="contain" />
            </View>

            

            {/* Claim Paid */}
            {isPaymentClaimed ? (
              <View style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, padding: 12, borderRadius: 10, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0F766E" style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E40AF' }}>Payment Claim Sent! ⏳</Text>
                <Text style={{ fontSize: 11, color: '#3B82F6', textAlign: 'center' }}>
                  Waiting for doctor to confirm receipt in real time. This page will unlock automatically.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleClaimPayment}
                disabled={isSubmittingClaim}
                style={{ backgroundColor: '#10B981', padding: 14, borderRadius: 12, width: '100%', alignItems: 'center' }}
              >
                {isSubmittingClaim ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✅ I Have Completed Payment (₹{fee})</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showPostPaymentOptions) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header navigation={navigation} />
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
              generatePdf();
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
      <Header navigation={navigation} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
           <ActivityIndicator size="large" color={Colors.primary} />
           <Text style={{ marginTop: 10, color: Colors.text }}>Fetching latest prescription...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        
        <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40 }} onPress={generatePdf}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Download PDF 📥</Text></TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 }} onPress={() => navigation.navigate('Dashboard')}><Text style={{ color: '#334155', fontSize: 16, fontWeight: '700' }}>Back to Dashboard</Text></TouchableOpacity>
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
