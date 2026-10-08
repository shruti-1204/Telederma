import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Platform,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '../utils/DatePickerCompat';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { mockDoctors } from '../services/mockData';
import { ConsultationContext } from '../context/ConsultationContext';
import api from '../services/api';
import { socketService } from '../services/socketService';
import { parseDoctorSlots } from '../utils/slotHelper';

const parseTimeToHoursMinutes = (timeStr) => {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const str = String(timeStr).trim().toUpperCase();
  const match = str.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3];
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }
  const singleMatch = str.match(/(\d{1,2})\s*(AM|PM)/);
  if (singleMatch) {
    let hours = parseInt(singleMatch[1], 10);
    const modifier = singleMatch[2];
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return { hours, minutes: 0 };
  }
  return { hours: 10, minutes: 0 };
};

const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const fullDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let label = '';
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = d.toLocaleDateString('en-US', { weekday: 'short' });
    dates.push({ id: 'd' + (i+1), label, date: dateStr, fullDate });
  }
  dates.push({ id: 'calendar', label: '📅 More', date: 'Select Date', isCalendar: true });
  return dates;
};
const DATES = generateDates();

export default function BookAppointmentScreen({ navigation, route }) {
  const incomingDoctor = route?.params?.doctor || mockDoctors[0];
  const { setBookingConfirmed } = useContext(ConsultationContext);

  const [doctor, setDoctor] = useState(() => {
    const parsed = parseDoctorSlots(incomingDoctor.availableSlots || incomingDoctor.slots);
    return {
      ...incomingDoctor,
      slots: parsed,
    };
  });

  const [selectedDate, setSelectedDate] = useState(DATES[0]);
  const [selectedSlot, setSelectedSlot] = useState(() => {
    const initialSlots = parseDoctorSlots(incomingDoctor.availableSlots || incomingDoctor.slots);
    return initialSlots.find((s) => s.available) || initialSlots[0] || { id: 's1', time: '10:00 AM' };
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Real-time backend states
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [isDoctorConfirmed, setIsDoctorConfirmed] = useState(false);
  const [isConsultationReady, setIsConsultationReady] = useState(false);
  const [meetRoomId, setMeetRoomId] = useState('td-room-live');

  // Auto-align selectedSlot when doctor slots change
  useEffect(() => {
    if (doctor.slots && doctor.slots.length > 0) {
      const exists = doctor.slots.find((s) => s.time === selectedSlot?.time);
      if (!exists) {
        setSelectedSlot(doctor.slots.find((s) => s.available) || doctor.slots[0]);
      }
    }
  }, [doctor.slots]);

  useEffect(() => {
    // Ensure real-time WebSocket connection is active
    socketService.connect();

    // Fetch freshest doctor slots directly from backend
    const fetchLiveDoctorSlots = async () => {
      try {
        let fetchId = incomingDoctor?.id;
        if (!fetchId || fetchId.length < 10) {
          try {
            const docsRes = await api.get('/doctors');
            if (docsRes.data?.data && docsRes.data.data.length > 0) {
              const verifiedDoc = docsRes.data.data.find((d) => d.isVerified) || docsRes.data.data[0];
              fetchId = verifiedDoc.id;
            }
          } catch(e) {}
        }
        if (!fetchId) return;
        
        const res = await api.get(`/doctors/${fetchId}`);
        if (res.data?.data) {
          const liveDoc = res.data.data;
          const freshSlots = parseDoctorSlots(liveDoc.availableSlots);
          const cleanName = liveDoc.user?.name || liveDoc.name || incomingDoctor?.name;
          const displayName = cleanName?.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`;
          setDoctor((prev) => ({
            ...prev,
            ...liveDoc,
            id: liveDoc.id,
            name: displayName,
            fee: liveDoc.consultationFee != null ? Number(liveDoc.consultationFee) : (prev.fee || 700),
            availableSlots: liveDoc.availableSlots,
            slots: freshSlots,
          }));
        }
      } catch (e) {
        console.warn('[BookAppointment] Live slots fetch notice:', e.message);
      }
    };

    fetchLiveDoctorSlots();

    // Real-time listener: When doctor modifies active schedule in Doctor App
    const unsubDocUpdated = socketService.on('doctor:updated', (updatedDoc) => {
      console.log('[BookAppointmentScreen] Live doctor:updated received:', updatedDoc);
      if (updatedDoc) {
        const matchesThisDoctor =
          updatedDoc.id === incomingDoctor.id ||
          updatedDoc.userId === incomingDoctor.userId ||
          updatedDoc.id === doctor.id;

        if (matchesThisDoctor && updatedDoc.availableSlots) {
          const freshSlots = parseDoctorSlots(updatedDoc.availableSlots);
          setDoctor((prev) => ({
            ...prev,
            ...updatedDoc,
            availableSlots: updatedDoc.availableSlots,
            slots: freshSlots,
          }));
        } else {
          fetchLiveDoctorSlots();
        }
      }
    });

    // Listen for doctor confirmation in real time
    const unsubConfirmed = socketService.on('appointment:confirmed', (confirmedAppt) => {
      console.log('[PatientApp] Live appointment:confirmed event received:', confirmedAppt);
      setIsDoctorConfirmed(true);
      if (confirmedAppt?.consultation?.roomId) {
        setMeetRoomId(confirmedAppt.consultation.roomId);
      }
    });

    // Listen for doctor starting consultation in real time
    const unsubReady = socketService.on('consultation:ready', (data) => {
      console.log('[PatientApp] Live consultation:ready received:', data);
      setIsConsultationReady(true);
      if (data?.roomId) {
        setMeetRoomId(data.roomId);
      }
    });

    return () => {
      unsubDocUpdated();
      unsubConfirmed();
      unsubReady();
    };
  }, [incomingDoctor?.id]);

  const handlePayNow = async () => {
    setIsProcessingPayment(true);
    try {
      // 1. Verify patient authentication token
      const token = await AsyncStorage.getItem('@telederma_auth_token');
      if (!token) {
        setShowPaymentModal(false);
        setIsProcessingPayment(false);
        alert('Please log in first to book an appointment.');
        navigation.navigate('Login');
        return;
      }

      // 2. Calculate appointment slot date range safely without invalid date errors
      const baseDate = selectedDate?.fullDate || new Date().toISOString().split('T')[0];
      const { hours, minutes } = parseTimeToHoursMinutes(selectedSlot?.time);
      const [year, month, day] = baseDate.split('-').map(Number);
      const slotStart = new Date(year, month - 1, day, hours, minutes, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

      // 3. Resolve Doctor Database ID (must be a valid Neon PostgreSQL ID)
      let targetDoctorId = doctor?.id || incomingDoctor?.id;
      if (!targetDoctorId || targetDoctorId.length < 10) {
        try {
          const docsRes = await api.get('/doctors');
          if (docsRes.data?.data && docsRes.data.data.length > 0) {
            const verifiedDoc = docsRes.data.data.find((d) => d.isVerified) || docsRes.data.data[0];
            targetDoctorId = verifiedDoc.id;
          }
        } catch (e) {
          console.warn('[BookAppointment] Could not resolve doctor ID:', e.message);
        }
      }

      if (!targetDoctorId || targetDoctorId.length < 10) {
        setShowPaymentModal(false);
        setIsProcessingPayment(false);
        alert('Unable to identify doctor. Please select a doctor from the doctor list.');
        return;
      }

      // 4. Post to Backend REST API
      let apptData = null;
      try {
        const res = await api.post('/appointments', {
          doctorId: targetDoctorId,
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
        });
        apptData = res.data?.data;
        if (apptData) {
          console.log('[PatientApp] Live appointment booked in DB:', apptData.id);
        }
      } catch (postErr) {
        setShowPaymentModal(false);
        setIsProcessingPayment(false);
        const status = postErr.response?.status;
        const msg = postErr.response?.data?.message || postErr.message || 'Failed to book slot';
        console.error('[PatientApp] Booking post error:', postErr.response?.data || postErr.message);

        if (status === 409) {
          alert(msg || 'This slot is already booked. Please choose a different date or time slot.');
        } else if (status === 401) {
          alert('Session expired. Please log in again.');
          navigation.navigate('Login');
        } else {
          alert(`Booking failed: ${msg}`);
        }
        return;
      }

      if (apptData) {
        setBookedAppointment(apptData);
        setMeetRoomId(`room_${apptData.id}`);
        if (apptData.status === 'CONFIRMED') {
          setIsDoctorConfirmed(true);
        }
        setPaymentSuccess(true);
        setBookingConfirmed(true);
      }
    } catch (err) {
      console.error('Payment/booking unexpected error:', err);
      setShowPaymentModal(false);
      alert('An unexpected error occurred while booking. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header navigation={navigation} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Doctor Summary Header */}
        <View style={styles.doctorHeaderCard}>
          <View style={styles.docAvatar}>
            <Text style={styles.docAvatarText}>
              {(doctor?.name || 'Dr').split(' ').filter(Boolean).map((w) => w[0]).join('')}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.docName}>{doctor?.name || 'Dr. Specialist'}</Text>
            <Text style={styles.docSpec}>{doctor?.specialization || 'Clinical Dermatology'}</Text>
            <Text style={styles.docFee}>Consultation Fee: ₹{doctor?.fee != null ? doctor.fee : 700}</Text>
          </View>
        </View>

        {/* STEP 1: SELECT DATE */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Select Consultation Date</Text>
          <View style={styles.datesGrid}>
            {DATES.map((item) => {
              const isSelected = selectedDate.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                  onPress={() => { if(item.isCalendar){ setShowDatePicker(true); } else { setSelectedDate(item); } }}
                >
                  <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>
                    {item.date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* STEP 2: SELECT TIME SLOT */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Select Available Time Slot</Text>
          <View style={styles.slotsGrid}>
            {doctor.slots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotBtn,
                    !slot.available && styles.slotBtnDisabled,
                    isSelected && styles.slotBtnSelected,
                  ]}
                  disabled={!slot.available}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      !slot.available && styles.slotTextDisabled,
                      isSelected && styles.slotTextSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                  <Text
                    style={[
                      styles.slotStatus,
                      isSelected && { color: '#FFFFFF' },
                      !slot.available && { color: Colors.textMuted },
                    ]}
                  >
                    {slot.available ? 'Available' : 'Booked'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* STEP 3: SUMMARY & FEE BREAKDOWN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Appointment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Consultation Type</Text>
            <Text style={styles.summaryValue}>HD Video Consultation</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Scheduled Date & Time</Text>
            <Text style={styles.summaryValue}>
              {selectedDate.fullDate} at {selectedSlot?.time || '09:30 AM'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Doctor Consultation Fee</Text>
            <Text style={styles.summaryValue}>₹{doctor.fee}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Policy</Text>
            <Text style={[styles.summaryValue, { color: '#0F766E', fontWeight: '700' }]}>
              Pay via UPI After Video Call
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Payable Now (Upfront)</Text>
            <Text style={[styles.totalAmount, { color: Colors.success }]}>₹0 (Free Booking)</Text>
          </View>
        </View>

        {/* Proceed to Payment CTA */}
        <TouchableOpacity
          style={styles.proceedPayBtn}
          onPress={() => { setShowPaymentModal(true); handlePayNow(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.proceedPayBtnText}>{isProcessingPayment ? "Booking..." : "Confirm Appointment ➔"}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* RAZORPAY MOCK PAYMENT MODAL */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!paymentSuccess ? (
                <View style={{alignItems: "center", padding: 20}}>
                  <ActivityIndicator size="large" color="#0F967E" />
                  <Text style={{marginTop: 10, fontWeight: "bold"}}>Booking Appointment...</Text>
                </View>
              ) : (
                /* Success Screen */
              <View style={styles.successBox}>
                <View style={[styles.successIconCircle, isDoctorConfirmed && { backgroundColor: '#D1FAE5' }]}>
                  <Text style={{ fontSize: 36 }}>{isDoctorConfirmed ? '✓' : '⚡'}</Text>
                </View>
                <Text style={styles.successTitle}>
                  {isDoctorConfirmed ? 'Doctor Confirmed! ✓' : 'Appointment Booked!'}
                </Text>
                <Text style={styles.successSubtitle}>
                  {isDoctorConfirmed
                    ? `Dr. ${doctor.name.replace('Dr. ', '')} has confirmed your appointment. You can now join the live WebRTC video consultation!`
                    : `Your booking for Dr. ${doctor.name.replace('Dr. ', '')} has been stored in PostgreSQL. Waiting for doctor confirmation in real time...`}
                </Text>

                {/* Real-time status pill */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDoctorConfirmed ? '#D1FAE5' : '#FEF3C7',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginVertical: 10,
                }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isDoctorConfirmed ? '#10B981' : '#F59E0B',
                    marginRight: 8,
                  }} />
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isDoctorConfirmed ? '#065F46' : '#92400E',
                  }}>
                    {isDoctorConfirmed ? 'DOCTOR CONFIRMED (REAL-TIME)' : 'LIVE WEBSOCKET SYNCING (Awaiting Doctor)'}
                  </Text>
                </View>

                <View style={styles.confirmedSummaryCard}>
                  <Text style={styles.confirmedDetail}>
                    📅 Date: {selectedDate.fullDate} ({selectedDate.label})
                  </Text>
                  <Text style={styles.confirmedDetail}>⏰ Time: {selectedSlot?.time}</Text>
                  <Text style={styles.confirmedDetail}>👨‍⚕️ Doctor: {doctor.name}</Text>
                  <Text style={styles.confirmedDetail}>💵 Consultation Fee: ₹{doctor.fee} (Payable via UPI after consultation)</Text>
                  <Text style={styles.confirmedDetail}>🔗 WebRTC Room: {meetRoomId}</Text>
                </View>

                

                <TouchableOpacity
                  style={styles.viewAllApptsBtn}
                  onPress={() => {
                    setShowPaymentModal(false);
                    navigation.navigate('Dashboard');
                  }}
                >
                  <Text style={styles.viewAllApptsBtnText}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setPickerDate(date);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                const fullDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                const label = date.toLocaleDateString('en-US', { weekday: 'long' });
                setSelectedDate({ id: 'custom', label, date: dateStr, fullDate });
              }
            }}
          />
        )}
        {showDatePicker && Platform.OS === 'web' && (
          <Modal visible={true} transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '80%', maxWidth: 400 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 16 }}>Select Date 📅</Text>
                
                <div style={{ width: '100%' }}>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    style={{ padding: 12, fontSize: 16, width: '100%', borderRadius: 8, border: '1px solid #ccc' }}
                    onChange={(e) => {
                      if(e.target.value) {
                        const date = new Date(e.target.value);
                        setPickerDate(date);
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                        const fullDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                        const label = date.toLocaleDateString('en-US', { weekday: 'long' });
                        setSelectedDate({ id: 'custom', label, date: dateStr, fullDate });
                      }
                      setShowDatePicker(false);
                    }}
                  />
                </div>
                
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(false)}
                  style={{ marginTop: 20, width: '100%', padding: 12, backgroundColor: '#94A3B8', borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

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
  doctorHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  docAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  docName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  docSpec: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  docFee: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 4,
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
    marginBottom: 12,
  },
  datesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  dateCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  dateDay: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dateDaySelected: {
    color: Colors.primary,
  },
  dateNum: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 2,
  },
  dateNumSelected: {
    color: Colors.primary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
  },
  slotBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#F1F5F9',
  },
  slotBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  slotTextDisabled: {
    color: Colors.textMuted,
  },
  slotTextSelected: {
    color: '#FFFFFF',
  },
  slotStatus: {
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  proceedPayBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  proceedPayBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  razorpayBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  razorpayText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalDoctorInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  modalDocName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textDark,
    marginTop: 4,
  },
  paymentMethodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
  },
  payMethodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  payMethodOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  payMethodText: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '500',
  },
  payMethodTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  confirmPayBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmPayBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  securityNote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmedSummaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 16,
    gap: 6,
  },
  confirmedDetail: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '500',
  },
  enterCallNowBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  enterCallNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  viewAllApptsBtn: {
    paddingVertical: 10,
  },
  viewAllApptsBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
