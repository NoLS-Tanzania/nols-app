import { colors } from "@nolsaf/native-ui";
import { AlertTriangle } from "lucide-react-native";
import { useState } from "react";
import { Linking } from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { GateScreen } from "./GateScreen";

export function ActionRequiredScreen() {
  const { user, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  return (
    <GateScreen
      icon={<AlertTriangle color={colors.warning} size={28} />}
      title="Action required on your application"
      message="Our team needs more information before approving your application. Please review the note below, then contact support to update your details."
      detail={user?.kycNote ?? undefined}
      primaryAction={{
        label: "Contact support",
        onPress: () => void Linking.openURL("mailto:support@nolsaf.com")
      }}
      secondaryAction={{
        label: "Check again",
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

export function RejectedScreen() {
  const { user, signOut } = useAuth();

  return (
    <GateScreen
      icon={<AlertTriangle color={colors.danger} size={28} />}
      title="Application not approved"
      message="We are sorry, your application to drive with NoLSAF was not approved. If you believe this is a mistake, please contact our support team."
      detail={user?.kycNote ?? undefined}
      primaryAction={{
        label: "Contact support",
        onPress: () => void Linking.openURL("mailto:support@nolsaf.com")
      }}
      secondaryAction={{ label: "Log out", onPress: () => void signOut() }}
    />
  );
}
