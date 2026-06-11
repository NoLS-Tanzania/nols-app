import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../auth";
import { AppButton, AppCard, AppInput, AppStack, AppText, GuestBottomNav, SafeScreen, ScreenHeader } from "../components";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { signUpCustomer } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 1 && email.includes("@") && password.length > 0;

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signUpCustomer({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeScreen contentStyle={styles.screen}>
        <AppStack gap={6}>
          <ScreenHeader
            title="Create customer account"
            subtitle="Start with a traveler profile. Driver, owner and operator roles come later."
            onBack={() => navigation.goBack()}
          />

          <AppCard>
            <AppStack gap={4}>
              <AppInput label="Full name" value={name} onChangeText={setName} placeholder="Your name" textContentType="name" />
              <AppInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <AppInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+255..."
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
              <AppInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create password"
                secureTextEntry
                textContentType="newPassword"
              />
              {error ? (
                <AppText variant="bodySmall" tone="danger">
                  {error}
                </AppText>
              ) : null}
              <AppButton title="Create and login" loading={loading} disabled={!canSubmit} onPress={submit} />
            </AppStack>
          </AppCard>

          <AppText variant="bodySmall" tone="muted" style={styles.center}>
            Your session will be stored using secure native storage after login.
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
  center: {
    textAlign: "center",
    paddingHorizontal: spacing[3]
  }
});
