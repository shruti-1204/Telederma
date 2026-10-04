import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';

export default function WebRTCVideoView({
  stream,
  isMuted = false,
  style,
  mirror = false,
  placeholderText = 'Connecting live video...',
  overlayLabel = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.log('[WebRTCVideoView] Auto-play notice:', err.message);
      });
    }
  }, [stream]);

  if (Platform.OS === 'web') {
    if (!stream) {
      return (
        <View style={[styles.placeholderContainer, style]}>
          <ActivityIndicator color="#0F6B59" size="small" />
          <Text style={styles.placeholderText}>{placeholderText}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.videoContainer, style]}>
        {React.createElement('video', {
          ref: videoRef,
          autoPlay: true,
          playsInline: true,
          muted: isMuted,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: mirror ? 'scaleX(-1)' : 'none',
            borderRadius: (style && style.borderRadius) || 0,
            backgroundColor: '#0D1B18',
          },
        })}
        {overlayLabel && (
          <View style={styles.overlayPill}>
            <View style={styles.liveDot} />
            <Text style={styles.overlayLabelText}>{overlayLabel}</Text>
          </View>
        )}
      </View>
    );
  }

  // Native fallback
  return (
    <View style={[styles.placeholderContainer, style]}>
      <Text style={styles.placeholderText}>{placeholderText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0D1B18',
  },
  placeholderContainer: {
    backgroundColor: '#0F2622',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  overlayPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  overlayLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
