import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../auth";
import { AppButton, AppCard, AppInput, AppStack, AppText, GuestBottomNav, SafeScreen, ScreenHeader } from "../components";
import { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeScreen contentStyle={styles.screen}>
        <AppStack gap={6}>
          <ScreenHeader
            title="Login"
            subtitle="Use your NoLSAF customer account to continue."
            onBack={() => navigation.goBack()}
          />

          <AppCard>
            <AppStack gap={4}>
              <View style={styles.icon} />
              <AppInput
                label="Email, username or phone"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
              />
              <AppInput
                label="Password"
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
              />
              {error ? (
                <AppText variant="bodySmall" tone="danger">
                  {error}
                </AppText>
              ) : null}
              <AppButton title="Login securely" loading={loading} disabled={!canSubmit} onPress={submit} />
            </AppStack>
          </AppCard>

          <AppText variant="bodySmall" tone="muted" style={styles.note}>
            Admin accounts are intentionally web-only. The native app begins with customer/traveler access.
          </AppText>
        </AppStack>
      </SafeScreen>

      <GuestBottomNav active="Login" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  screen: {
    justifyContent: "center",
    paddingBottom: spacing[4]
  },
  icon: {
    width: 54,
    height: 6,
    alignSelf: "center",
    borderRadius: radius.full,
    backgroundColor: colors.primary
  },
  note: {
    textAlign: "center",
    paddingHorizontal: spacing[3]
  }
});
