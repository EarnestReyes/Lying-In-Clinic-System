import {
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import { Colors } from "../src/theme/colors";

export default function Card({
  children,
  style,
  ...props
}: ViewProps) {
  return (
    <View
      {...props}
      style={[styles.card, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,

    shadowColor: Colors.overlay,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 15,

    elevation: 3,
  },
});
