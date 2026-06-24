import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppStack, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, XCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { changePassword } from "../driver/driverApi";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ChangePassword">;

const MIN_LENGTH = 8;
const MAX_LENGTH = 12;

function evaluatePassword(password: string) {
  return [
    { check: password.length >= MIN_LENGTH && password.length <= MAX_LENGTH, label: `${MIN_LENGTH}-${MAX_LENGTH} characters` },
    { check: /[A-Z]/.test(password), label: "One uppercase letter (A-Z)" },
    { check: /[a-z]/.test(password), label: "One lowercase letter (a-z)" },
    { check: /[0-9]/.test(password), label: "One number (0-9)" },
    { check: /[!@#$%^&*()\-_=+[\]{};:'"\\|,<.>/?`~]/.test(password), label: "One special character (!@#$%)" },
    { check: !/\s/.test(password), label: "No spaces" }
  ];
}

function RevealToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onToggle} style={styles.revealButton}>
      {shown ? <EyeOff color={colors.primary} size={14} /> : <Eye color={colors.primary} size={14} />}
      <AppText variant="caption" weight="bold" tone="primary">
        {shown ? "Hide" : "Show"}
      </AppText>
    </Pressable>
  );
}

export function ChangePasswordScreen({ navigation }: Props) {
  const { token, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requirements = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const score = requirements.filter((req) => req.check).length;
  const allRequirementsMet = score === requirements.length;
  const strength: "weak" | "medium" | "strong" =
    score === requirements.length ? "strong" : score >= requirements.length - 2 ? "medium" : "weak";
  const sameAsCurrent = Boolean(currentPassword && newPassword && currentPassword === newPassword);
  const passwordsMatch = confirmPassword.length > 0 ? confirmPassword === newPassword : null;

  const canSubmit =
    Boolean(currentPassword) && allRequirementsMet && !sameAsCurrent && passwordsMatch === true && !saving;

  async function handleSave() {
    if (!token) return;
    setError(null);
    setSuccess(null);

    if (!allRequirementsMet) {
      setError(
        `Your new password must be ${MIN_LENGTH}-${MAX_LENGTH} characters and include an uppercase letter, a lowercase letter, a number, and a special character.`
      );
      return;
    }
    if (sameAsCurrent) {
      setError("Your new password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Your new passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const response = await changePassword(token, { currentPassword, newPassword });
      if (response.data.forceLogout) {
        await signOut();
        return;
      }
      setSuccess(response.message || "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Password
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppCard>
          <AppStack gap={3}>
            <View style={styles.introRow}>
              <View style={styles.iconWrap}>
                <Lock color={colors.primary} size={18} />
              </View>
              <AppStack gap={1} style={styles.introText}>
                <AppText variant="bodySmall" weight="bold">
                  Keep your account secure
                </AppText>
                <AppText variant="caption" tone="muted">
                  Use {MIN_LENGTH}-{MAX_LENGTH} characters you have not used before. For your safety, the new password
                  cannot be the same as your current one.
                </AppText>
              </AppStack>
            </View>

            <AppInput
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              hint={<RevealToggle shown={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />}
            />

            <AppInput
              label="New password"
              value={newPassword}
              onChangeText={(value) => setNewPassword(value.slice(0, MAX_LENGTH))}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              maxLength={MAX_LENGTH}
              error={sameAsCurrent ? "This is your current password. Choose a different one." : undefined}
              hint={<RevealToggle shown={showNew} onToggle={() => setShowNew((v) => !v)} />}
            />

            {newPassword ? (
              <View style={styles.strengthBox}>
                <View style={styles.strengthHeader}>
                  <AppText
                    variant="caption"
                    weight="bold"
                    tone={strength === "strong" ? "success" : strength === "medium" ? "warning" : "danger"}
                  >
                    {strength === "strong" ? "Strong password" : strength === "medium" ? "Needs improvement" : "Too weak"}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {score}/{requirements.length}
                  </AppText>
                </View>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      strength === "strong" ? styles.strengthStrong : strength === "medium" ? styles.strengthMedium : styles.strengthWeak,
                      { width: `${(score / requirements.length) * 100}%` }
                    ]}
                  />
                </View>
                <View style={styles.requirementsGrid}>
                  {requirements.map((req) => (
                    <View key={req.label} style={styles.requirementRow}>
                      {req.check ? <CheckCircle2 color={colors.success} size={14} /> : <XCircle color={colors.softText} size={14} />}
                      <AppText variant="caption" tone={req.check ? "success" : "muted"}>
                        {req.label}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <AppInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={(value) => setConfirmPassword(value.slice(0, MAX_LENGTH))}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              maxLength={MAX_LENGTH}
              error={passwordsMatch === false ? "Passwords do not match." : undefined}
              hint={<RevealToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />}
            />
            {passwordsMatch === true ? (
              <View style={styles.matchRow}>
                <CheckCircle2 color={colors.success} size={14} />
                <AppText variant="caption" tone="success">
                  Passwords match
                </AppText>
              </View>
            ) : null}

            <AppButton title="Update password" loading={saving} disabled={!canSubmit} onPress={handleSave} />
            {error ? (
              <AppText variant="caption" tone="danger">
                {error}
              </AppText>
            ) : null}
            {success ? (
              <AppText variant="caption" tone="success">
                {success}
              </AppText>
            ) : null}
          </AppStack>
        </AppCard>
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
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3]
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  introText: {
    flex: 1,
    minWidth: 0
  },
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  strengthBox: {
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  strengthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  strengthTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden"
  },
  strengthFill: {
    height: "100%",
    borderRadius: radius.full
  },
  strengthWeak: {
    backgroundColor: colors.danger
  },
  strengthMedium: {
    backgroundColor: colors.warning
  },
  strengthStrong: {
    backgroundColor: colors.success
  },
  requirementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2]
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    minWidth: "47%"
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  }
});
