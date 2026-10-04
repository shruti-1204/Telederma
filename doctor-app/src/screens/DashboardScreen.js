import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { socketService } from '../services/socketService';

const CATEGORIES = ["All", "Pending Consultations", "Today's Appointments", "Upcoming Patients", "Follow-ups"];

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Connect to Real-Time WebSocket Gateway
    socketService.connect();

    // Listen for new appointment booked by Patient in Real-Time!
    const unsubNew = socketService.on('appointment:new', (appt) => {
      console.log('[Doctor App] Live Appointment Received:', appt);
      let category = "Pending Consultations";
      let triage = "YELLOW";
      if (appt.status === 'CONFIRMED') { category = "Today's Appointments"; triage = 'YELLOW'; }
      if (appt.status === 'COMPLETED') { category = "Follow-ups"; triage = 'GREEN'; }
      if (appt.status === 'PENDING') { category = "Pending Consultations"; triage = 'YELLOW'; }

      const pName =
        appt.patient?.user?.name ||
        (appt.patient?.user?.phone ? `Patient (+91 ${appt.patient.user.phone})` : 'Patient');

      const newPatient = {
        id: appt.id,
        name: pName,
        time: new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: category,
        triage: triage,
        aiSummary: "AI Triage: Grade II Inflammatory Acne (Moderate)",
        backendData: appt,
      };

      setPatients((prev) => [newPatient, ...prev.filter((p) => p.id !== appt.id)]);
    });

    // Listen for appointment confirmed/updated
    const unsubConfirmed = socketService.on('appointment:confirmed', (appt) => {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === appt.id
            ? { ...p, category: "Today's Appointments", triage: 'YELLOW', backendData: appt }
            : p
        )
      );
    });

    return () => {
      unsubNew();
      unsubConfirmed();
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Doctor Profile for Name
      const meRes = await api.get('/auth/me');
      if (meRes.data && meRes.data.data) {
        setUser(meRes.data.data);
      }

      // Fetch Appointments
      const response = await api.get('/appointments');
      if (response.data && response.data.data) {
        // Map backend schema to frontend UI schema
        const formattedData = response.data.data.map(appt => {
          let category = "Pending Consultations";
          let triage = "YELLOW";
          if (appt.status === 'CONFIRMED') { category = "Today's Appointments"; triage = 'YELLOW'; }
          if (appt.status === 'COMPLETED') { category = "Follow-ups"; triage = 'GREEN'; }
          if (appt.status === 'PENDING') { category = "Pending Consultations"; triage = 'YELLOW'; }
          
          const pName =
            appt.patient?.user?.name ||
            (appt.patient?.user?.phone ? `Patient (+91 ${appt.patient.user.phone})` : 'Patient');

          return {
            id: appt.id,
            name: pName,
            time: new Date(appt.slotStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            category: category,
            triage: triage,
            aiSummary: "AI Triage: Grade II Inflammatory Acne (Moderate)",
            backendData: appt
          };
        });
        setPatients(formattedData);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = activeTab === "All" 
    ? patients 
    : patients.filter(p => p.category === activeTab);

  const renderPatientCard = ({ item }) => {
    const getTriageColor = (triage) => {
      if (triage === 'RED') return { bg: '#FFE3E3', text: '#D32F2F' };
      if (triage === 'YELLOW') return { bg: '#FFF4E5', text: '#ED6C02' };
      return { bg: '#E8F5E9', text: '#2E7D32' };
    };
    const colors = getTriageColor(item.triage);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PatientDetail', { patient: item })}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.name}</Text>
            <Text style={styles.patientInfo}>{item.category}  â€¢  {item.time}</Text>
          </View>
          <View style={[styles.triageBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.triageText, { color: colors.text }]}>{item.triage}</Text>
          </View>
        </View>
        
        {/* Phase 2: AI Summary Snippet on Card */}
        <View style={styles.aiSnippetBox}>
          <Text style={styles.aiSnippetText}>ðŸ¤– AI: {item.aiSummary}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>Start Consultation / View Record</Text>
          <Text style={styles.arrowIcon}>âž”</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Modern Profile Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name ? user.name : 'Doctor'}</Text>
          <Text style={styles.subGreeting}>{patients.length > 0 ? `You have ${patients.length} patients today.` : `No appointments scheduled yet.`}</Text>
        </View>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'D'}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>₹14,250</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Schedule & Appts</Text>
        </TouchableOpacity>
      </View>
      
      {/* Phase 2: Category Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {CATEGORIES.map((cat, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.tabBtn, activeTab === cat && styles.tabBtnActive]}
              onPress={() => setActiveTab(cat)}
            >
              <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList 
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={renderPatientCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40}}>
            <Text style={{color: '#666', fontSize: 16, textAlign: 'center'}}>
              No patients scheduled yet.
            </Text>
            <Text style={{color: '#999', fontSize: 14, textAlign: 'center', marginTop: 10}}>
              Wait for the patient app to book appointments.
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F7F6' }, // Soft modern background
  
  // Premium Header Styling
  topHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: '#ffffff', padding: 25, paddingTop: 40, 
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35, 
    shadowColor: '#113F36', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 8, 
    marginBottom: 25 
  },
  greeting: { fontSize: 26, fontWeight: '900', color: '#113F36', marginBottom: 6, letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: '#718096', fontWeight: '600' },
  avatarPlaceholder: { width: 56, height: 56, backgroundColor: '#0F6B59', borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#0F6B59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  avatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 20 },
  
  // Analytics & Schedule
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginHorizontal: 5, alignItems: 'center', shadowColor: '#113F36', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#2D3748', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#718096', fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#113F36', paddingHorizontal: 25, marginBottom: 15 },
  
  // Phase 2 Tabs
  tabContainer: { marginBottom: 20 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#E8F3F1', borderRadius: 25, marginRight: 10 },
  tabBtnActive: { backgroundColor: '#0F6B59' },
  tabText: { color: '#718096', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#ffffff' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // Premium Card Styling
  card: { 
    backgroundColor: '#ffffff', borderRadius: 24, padding: 22, marginBottom: 18, 
    shadowColor: '#113F36', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5, 
    borderWidth: 1, borderColor: '#E8F3F1' 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  patientName: { fontSize: 20, fontWeight: '800', color: '#2D3748', marginBottom: 6, letterSpacing: -0.3 },
  patientInfo: { fontSize: 13, color: '#A0AEC0', fontWeight: '700' },
  
  // AI Snippet
  aiSnippetBox: { backgroundColor: '#F7FAFC', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E8F3F1' },
  aiSnippetText: { fontSize: 13, color: '#4A5568', fontStyle: 'italic', fontWeight: '600' },

  // Soft Medical Badges
  triageBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, marginLeft: 10 },
  triageText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F7FAFC', paddingTop: 18 },
  viewDetailsText: { fontSize: 15, color: '#0F6B59', fontWeight: '800' },
  arrowIcon: { fontSize: 18, color: '#0F6B59', fontWeight: '900' }
});

export default DashboardScreen;

