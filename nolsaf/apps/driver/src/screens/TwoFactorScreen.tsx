import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppStack, AppText, colors, radius, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetch2FAStatus, provision2FA, update2FA } from "../driver/driverApi";
import { TwoFactorProvisionResponse, TwoFactorStatus } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TwoFactor">;

export function TwoFactorScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [provision, setProvision] = useState<TwoFactorProvisionResponse | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to manage two factor authentication.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetch2FAStatus(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your security settings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startEnable() {
    if (!token) return;
    setProvisioning(true);
    setFormError(null);
    try {
      setProvision(await provision2FA(token));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not start setup.");
    } finally {
      setProvisioning(false);
    }
  }

  async function confirmEnable() {
    if (!token || !provision) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await update2FA(token, { type: "totp", action: "enable", code, secret: provision.secret });
      if (response.backupCodes) setBackupCodes(response.backupCodes);
      setProvision(null);
      setCode("");
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not verify that code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function disable() {
    if (!token) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await update2FA(token, { type: "totp", action: "disable", code });
      setCode("");
      setBackupCodes(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not disable two factor authentication.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Two factor authentication
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <StateView title="Loading your security settings" message="Fetching your two factor authentication status." />
        ) : error ? (
          <StateView title="Could not load settings" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : status ? (
          <AppStack gap={4}>
            <AppCard>
              <AppStack gap={2}>
                <AppText variant="titleSm" weight="bold">
                  {status.totpEnabled ? "Two factor authentication is on" : "Two factor authentication is off"}
                </AppText>
                <AppText variant="bodySmall" tone="muted">
                  Use an authenticator app to generate a one time code each time you sign in.
                </AppText>
              </AppStack>
            </AppCard>

            {backupCodes ? (
              <AppCard tone="success">
                <AppStack gap={2}>
                  <AppText variant="titleSm" weight="bold">
                    Save your backup codes
                  </AppText>
                  <AppText variant="bodySmall" tone="muted">
                    Keep these somewhere safe. You can use one of these codes to sign in if you lose access to your authenticator app.
                  </AppText>
                  {backupCodes.map((codeValue) => (
                    <AppText key={codeValue} variant="body" weight="bold">
                      {codeValue}
                    </AppText>
                  ))}
                </AppStack>
              </AppCard>
            ) : null}

            {!status.totpEnabled ? (
              provision ? (
                <AppCard>
                  <AppStack gap={3}>
                    <AppText variant="titleSm" weight="bold">
                      Scan this code
                    </AppText>
                    <AppText variant="bodySmall" tone="muted">
                      Scan this with your authenticator app, then enter the 6 digit code it shows.
                    </AppText>
                    <Image source={{ uri: provision.qr }} style={styles.qr} />
                    <AppText variant="caption" tone="muted">
                      Or enter this key manually: {provision.secret}
                    </AppText>
                    <AppInput label="6 digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                    <AppButton title="Confirm and enable" loading={submitting} onPress={confirmEnable} />
                    {formError ? (
                      <AppText variant="caption" tone="danger">
                        {formError}
                      </AppText>
                    ) : null}
                  </AppStack>
                </AppCard>
              ) : (
                <AppButton title="Enable two factor authentication" loading={provisioning} onPress={startEnable} />
              )
            ) : (
              <AppCard>
                <AppStack gap={3}>
                  <AppText variant="titleSm" weight="bold">
                    Disable two factor authentication
                  </AppText>
                  <AppInput label="6 digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                  <AppButton title="Disable" variant="danger" loading={submitting} onPress={disable} />
                  {formError ? (
                    <AppText variant="caption" tone="danger">
                      {formError}
                    </AppText>
                  ) : null}
                </AppStack>
              </AppCard>
            )}
          </AppStack>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  qr: {
    width: 200,
    height: 200,
    alignSelf: "center"
  }
});
