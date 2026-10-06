import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RTCView, isNativeSupported } from '../services/webrtcAdapter';

export default function WebRTCVideoView({
  stream,
  isMuted = false,
  style,
  mirror = false,
  placeholderText = 'Connecting live video...',
  overlayLabel = null,
}) {
  const streamURL = stream && typeof stream.toURL === 'function' ? stream.toURL() : null;

  if (RTCView && streamURL) {
    return (
      <View style={[styles.videoContainer, style]}>
        <RTCView
          streamURL={streamURL}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={mirror}
          zOrder={mirror ? 1 : 0}
        />
        {overlayLabel && (
          <View style={styles.overlayPill}>
            <View style={styles.liveDot} />
            <Text style={styles.overlayLabelText}>{overlayLabel}</Text>
          </View>
        )}
      </View>
    );
  }

  // Fallback placeholder when stream is loading or waiting for peer
  return (
    <View style={[styles.placeholderContainer, style]}>
      <ActivityIndicator color="#2A9D8F" size="small" />
      <Text style={styles.placeholderText}>{placeholderText}</Text>
      {!isNativeSupported && (
        <Text style={styles.devBuildHint}>
          (Expo Development Build required for native camera)
        </Text>
      )}
      {overlayLabel && (
        <View style={styles.overlayPill}>
          <View style={styles.liveDot} />
          <Text style={styles.overlayLabelText}>{overlayLabel}</Text>
        </View>
      )}
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
  devBuildHint: {
    color: '#E9A23B',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
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
    zIndex: 10,
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
