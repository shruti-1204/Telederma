import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';

export default function Header({ navigation }) {
  const { patient, logout } = useContext(AuthContext);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [patient?.photoUri]);

  return (
    <View style={styles.header}>
      {/* Brand logo & platform title */}
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🩺</Text>
        </View>
        <View style={styles.titleCol}>
          <View style={styles.nameRow}>
            <Text style={styles.brandTitle}>TeleDerma</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>👤 Patient App</Text>
            </View>
          </View>
          <Text style={styles.brandSubtitle}>Teledermatology Platform</Text>
        </View>
      </View>

      {/* User profile & settings shortcut */}
      <TouchableOpacity
        style={styles.userChip}
        onPress={() => navigation?.navigate('SkinProfile')}
        accessibilityLabel="header-profile-btn"
        activeOpacity={0.8}
      >
        <View style={styles.avatar}>
          {patient?.photoUri && !imgError ? (
            <Image
              source={{ uri: patient.photoUri }}
              style={styles.avatarImg}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text style={styles.avatarText}>
              {patient?.name ? patient.name[0].toUpperCase() : 'P'}
            </Text>
          )}
        </View>
        <Text style={styles.userName} numberOfLines={1}>
          {patient?.name || 'Patient'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.logoTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: Colors.logoTeal,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIcon: {
    fontSize: 20,
  },
  titleCol: {
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.logoTeal,
    letterSpacing: -0.3,
  },
  roleChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  brandSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B6B6B',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
    maxWidth: 110,
  },
});
