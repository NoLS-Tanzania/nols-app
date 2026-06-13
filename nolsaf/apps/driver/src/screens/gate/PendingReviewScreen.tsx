import { colors } from "@nolsaf/native-ui";
import { Clock } from "lucide-react-native";
import { useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { GateScreen } from "./GateScreen";

export function PendingReviewScreen() {
  const { refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  return (
    <GateScreen
      icon={<Clock color={colors.primary} size={28} />}
      title="Application under review"
      message="Thanks for applying to drive with NoLSAF. Our team is reviewing your details and documents. This usually takes one to two business days."
      primaryAction={{
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
      secondaryAction={{ label: "Log out", onPress: () => void signOut() }}
    />
  );
}
