import { Platform } from 'react-native';

let Component;
if (Platform.OS === 'web') {
  Component = require('./WebRTCVideoView.web').default;
} else {
  Component = require('./WebRTCVideoView.native').default;
}

export default Component;
