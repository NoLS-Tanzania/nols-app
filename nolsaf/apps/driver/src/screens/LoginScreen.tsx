import { AppButton, AppCard, AppInput, AppStack, AppText, colors, NolsafLogoMark, SafeScreen } from "@nolsaf/native-ui";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";

export function LoginScreen() {
  const { signIn, error: authError } = useAuth();
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
      setError(e instanceof Error ? e.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen contentStyle={styles.content}>
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <NolsafLogoMark color={colors.white} width={36} height={36} />
        </View>
        <AppStack gap={1}>
          <AppText variant="headline" weight="extraBold">
            NoLSAF Driver
          </AppText>
          <AppText variant="bodySmall" tone="muted">
            Sign in to start receiving trips and earning with NoLSAF.
          </AppText>
        </AppStack>
      </View>

      <AppCard style={styles.card}>
        <AppStack gap={4}>
          <AppInput
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error || authError ? (
            <AppText variant="bodySmall" tone="danger">
              {error || authError}
            </AppText>
          ) : null}
          <AppButton title="Log in" loading={loading} disabled={!canSubmit} onPress={submit} />
        </AppStack>
      </AppCard>

      <AppText variant="caption" tone="soft" style={styles.footer}>
        Driver accounts are created and approved through the NoLSAF website. Once approved, you can sign in here with the same email and password.
      </AppText>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 24
  },
  brand: {
    alignItems: "center",
    gap: 16
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDeep
  },
  card: {
    width: "100%"
  },
  footer: {
    textAlign: "center"
  }
});
