import { colors } from "@nolsaf/native-ui";
import { Ban } from "lucide-react-native";
import { Linking } from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { GateScreen } from "./GateScreen";

export function SuspendedScreen() {
  const { signOut } = useAuth();

  return (
    <GateScreen
      icon={<Ban color={colors.danger} size={28} />}
      title="Your account is suspended"
      message="Your driver account has been temporarily suspended. Please contact our support team for help resolving this."
      primaryAction={{
        label: "Contact support",
        onPress: () => void Linking.openURL("mailto:support@nolsaf.com")
      }}
      secondaryAction={{ label: "Log out", onPress: () => void signOut() }}
    />
  );
}
