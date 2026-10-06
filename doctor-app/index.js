import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  '[Patient WebRTC]',
  '[Doctor WebRTC]',
  '[WebRTC Native]',
]);

registerRootComponent(App);
