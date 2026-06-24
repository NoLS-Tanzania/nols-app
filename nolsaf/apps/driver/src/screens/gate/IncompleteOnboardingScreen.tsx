import { colors } from "@nolsaf/native-ui";
import { ClipboardList } from "lucide-react-native";
import { useState } from "react";
import { Linking } from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { GateScreen } from "./GateScreen";

export function IncompleteOnboardingScreen() {
  const { refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  return (
    <GateScreen
      icon={<ClipboardList color={colors.primary} size={28} />}
      title="Finish your professional profile"
      message="A few details are still missing from your driver profile, such as your vehicle information, payment details, or required documents. Please complete your profile on the NoLSAF website to continue."
      primaryAction={{
        label: "Open NoLSAF website",
        onPress: () => void Linking.openURL("https://nolsaf.com")
      }}
      secondaryAction={{
        label: "I have updated my profile, check again",
        loading: checking,
        onPress: async () => {
          setChecking(true);
          try {
            await refreshProfile();
          } finally {
            setChecking(false);
          }
        }
      }}
    />
  );
}
