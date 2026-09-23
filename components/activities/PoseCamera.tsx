import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { ComponentType } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { PoseFrame } from '../../src/models/Activity';

interface NativeProps {
  style: StyleProp<ViewStyle>;
  onPose: (event: { nativeEvent: PoseFrame }) => void;
  onError: (event: { nativeEvent: { message: string } }) => void;
}
// An old native binary / Expo Go must show a real unsupported state, never simulated poses.
export const poseCameraAvailable = Platform.OS !== 'web' && !!requireOptionalNativeModule('PrenatalPose');
const NativeCamera: ComponentType<NativeProps> | null = poseCameraAvailable ? requireNativeView<NativeProps>('PrenatalPose') : null;
export default function PoseCamera(props: NativeProps) { return NativeCamera ? <NativeCamera {...props} /> : null; }
