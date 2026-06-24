import {
  AppButton,
  AppInput,
  AppText,
  NolsafLogoMark,
  SafeScreen,
  colors,
  getErrorMessage,
  spacing
} from "@nolsaf/native-ui";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../auth";

// The single Partners login. One login for both Owner and Operator; the role on
// the account decides which dashboard renders (see RoleGateScreen). No
// registration here, partners already hold accounts.
export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err, "We could not sign you in. Check your details and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeScreen contentStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={styles.logoFrame}>
          <NolsafLogoMark color={colors.white} width={34} height={34} />
        </View>
        <View style={styles.brandText}>
          <AppText variant="titleSm" weight="bold">
            NoLSAF Partners
          </AppText>
          <AppText variant="bodySmall" tone="muted">
            Owners and tour operators
          </AppText>
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="title" weight="bold">
          Sign in
        </AppText>
        <AppText variant="bodySmall" tone="muted" style={styles.intro}>
          Use the same NoLSAF account you use on the web. We will take you to your dashboard.
        </AppText>

        <View style={styles.form}>
          <AppInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            error={error ?? undefined}
          />
          <AppButton title="Sign in" loading={submitting} onPress={onSubmit} />
        </View>
      </View>

      <AppText variant="caption" tone="soft" style={styles.footer}>
        Admin tools stay on the secured web portal. This app is for property owners and tour operators only.
      </AppText>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[5],
    justifyContent: "center"
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  logoFrame: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  brandText: {
    minWidth: 0,
    flexShrink: 1
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[5],
    gap: spacing[2]
  },
  intro: {
    marginTop: spacing[1]
  },
  form: {
    marginTop: spacing[4],
    gap: spacing[4]
  },
  footer: {
    textAlign: "center"
  }
});
