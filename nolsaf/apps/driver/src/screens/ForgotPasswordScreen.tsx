import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppStack, AppText, colors, SafeScreen } from "@nolsaf/native-ui";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { resetPasswordWithToken, sendPasswordResetOtp, verifyPasswordResetOtp } from "../driver/driverApi";
import { getErrorMessage } from "../lib/apiClient";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;
type ResetMethod = "email" | "phone";
type ResetStep = "request" | "verify" | "reset" | "success";
const OTP_SENT_PATTERN = /^otp sent$/i;
const OTP_EXPIRY_SECONDS = 3 * 60;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function passwordRequirements(password: string) {
  return [
    { ok: password.length >= 8, label: "At least 8 characters" },
    { ok: /[a-z]/.test(password), label: "One lowercase letter" },
    { ok: /[A-Z]/.test(password), label: "One uppercase letter" },
    { ok: /\d/.test(password), label: "One number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "One special character" }
  ];
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const [method, setMethod] = useState<ResetMethod>("email");
  const [step, setStep] = useState<ResetStep>("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [userId, setUserId] = useState<string | number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  const destination = method === "email" ? { email: email.trim().toLowerCase() } : { phone: phone.trim() };
  const destinationLabel = method === "email" ? email.trim().toLowerCase() : phone.trim();
  const accountLabel = method === "email" ? "email address" : "phone number";
  const canRequest = method === "email" ? isValidEmail(email) : phone.trim().length >= 7;
  const requirements = passwordRequirements(password);
  const strength = requirements.filter((item) => item.ok).length;
  const missingRequirements = requirements.filter((item) => !item.ok);
  const canReset = resetToken && userId != null && password.length >= 8 && password === confirmPassword;
  const isOtpExpired = step === "verify" && otpExpiresIn <= 0;

  useEffect(() => {
    if (step !== "verify" || otpExpiresIn <= 0) return;
    const timer = setInterval(() => {
      setOtpExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpExpiresIn > 0]);

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  async function requestCode() {
    if (!canRequest || loading) return;
    setLoading(true);
    resetMessages();
    try {
      const response = await sendPasswordResetOtp(destination);
      if (!OTP_SENT_PATTERN.test(response.message || "")) {
        setStep("request");
        setError(`No driver account was found with this ${accountLabel}. Check the details or register first.`);
        return;
      }
      setOtp("");
      setOtpExpiresIn(response.otpExpiresInSeconds ?? OTP_EXPIRY_SECONDS);
      setMessage(`Verification code sent to ${destinationLabel}.`);
      setStep("verify");
    } catch (e) {
      setError(getErrorMessage(e, "Unable to send verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (otp.trim().length < 4 || loading || isOtpExpired) return;
    setLoading(true);
    resetMessages();
    try {
      const response = await verifyPasswordResetOtp(destination, otp.trim());
      setResetToken(response.resetToken);
      setUserId(response.user.id);
      setStep("reset");
    } catch (e) {
      setError(getErrorMessage(e, "Invalid or expired code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    if (!canReset || loading || userId == null) return;
    setLoading(true);
    resetMessages();
    try {
      await resetPasswordWithToken(userId, resetToken, password);
      setStep("success");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(getErrorMessage(e, "Unable to reset password. Please choose a stronger password or try again."));
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    navigation.navigate("Login");
  }

  return (
    <SafeScreen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="headline" weight="extraBold" style={styles.title}>
          Reset password
        </AppText>
        <AppText variant="bodySmall" tone="muted" style={styles.subtitle}>
          Verify your account and create a new password inside the NoLSAF Driver APP.
        </AppText>
      </View>

      <AppCard style={styles.card}>
        <AppStack gap={5}>
          {error ? (
            <AppText variant="bodySmall" tone="danger">
              {error}
            </AppText>
          ) : null}
          {message && !error && step !== "verify" ? (
            <AppText variant="bodySmall" tone="primary">
              {message}
            </AppText>
          ) : null}

          {step === "request" ? (
            <>
              <View style={styles.segment}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMethod("email");
                    resetMessages();
                  }}
                  style={[styles.segmentOption, method === "email" && styles.segmentOptionActive]}
                >
                  <AppText variant="caption" weight="bold" style={method === "email" ? styles.segmentTextActive : styles.segmentText}>
                    Email
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMethod("phone");
                    resetMessages();
                  }}
                  style={[styles.segmentOption, method === "phone" && styles.segmentOptionActive]}
                >
                  <AppText variant="caption" weight="bold" style={method === "phone" ? styles.segmentTextActive : styles.segmentText}>
                    Phone
                  </AppText>
                </Pressable>
              </View>

              {method === "email" ? (
                <AppInput
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    resetMessages();
                  }}
                />
              ) : (
                <AppInput
                  label="Phone"
                  placeholder="+255..."
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value);
                    resetMessages();
                  }}
                />
              )}
              <AppButton title="Send verification code" loading={loading} disabled={!canRequest} onPress={requestCode} />
              <Pressable accessibilityRole="button" onPress={backToLogin} style={styles.centerLink}>
                <AppText variant="bodySmall" weight="bold" style={styles.linkText}>
                  Back to sign in
                </AppText>
              </Pressable>
            </>
          ) : null}

          {step === "verify" ? (
            <>
              <AppText variant="bodySmall" tone="muted" style={styles.centerText}>
                Enter the code sent to {destinationLabel}.
              </AppText>
              <AppText variant="caption" tone={isOtpExpired ? "danger" : "soft"} style={styles.centerText}>
                {isOtpExpired ? "This verification code has expired. Request a new code." : `Code expires in ${formatCountdown(otpExpiresIn)}.`}
              </AppText>
              <AppInput
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                value={otp}
                onChangeText={(value) => {
                  setOtp(value.replace(/[^0-9]/g, ""));
                  resetMessages();
                }}
              />
              <AppButton title="Verify code" loading={loading} disabled={otp.trim().length < 4 || isOtpExpired} onPress={verifyCode} />
              <Pressable
                accessibilityRole="button"
                onPress={requestCode}
                disabled={loading || !isOtpExpired}
                style={[styles.centerLink, !isOtpExpired && styles.disabledLink]}
              >
                <AppText variant="bodySmall" weight="bold" style={isOtpExpired ? styles.linkText : styles.disabledLinkText}>
                  {isOtpExpired ? "Send new code" : `Resend available in ${formatCountdown(otpExpiresIn)}`}
                </AppText>
              </Pressable>
            </>
          ) : null}

          {step === "reset" ? (
            <>
              <AppInput
                label="New password"
                placeholder="New password"
                secureTextEntry
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  resetMessages();
                }}
              />
              <View style={styles.strengthTrack}>
                {[0, 1, 2, 3, 4].map((item) => (
                  <View key={item} style={[styles.strengthBar, item < strength && styles.strengthBarActive]} />
                ))}
              </View>
              {missingRequirements.length ? (
                <AppText variant="caption" tone="soft" style={styles.centerText}>
                  Missing: {missingRequirements.slice(0, 2).map((item) => item.label).join(", ")}
                </AppText>
              ) : null}
              <AppInput
                label="Confirm password"
                placeholder="Confirm password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  resetMessages();
                }}
              />
              {confirmPassword && password !== confirmPassword ? (
                <AppText variant="caption" tone="danger">
                  Passwords do not match.
                </AppText>
              ) : null}
              <AppButton title="Save new password" loading={loading} disabled={!canReset} onPress={savePassword} />
            </>
          ) : null}

          {step === "success" ? (
            <>
              <View style={styles.successBadge}>
                <AppText variant="headline" weight="extraBold" style={styles.successMark}>
                  ✓
                </AppText>
              </View>
              <AppText variant="title" weight="extraBold" style={styles.centerText}>
                Password updated
              </AppText>
              <AppText variant="bodySmall" tone="muted" style={styles.centerText}>
                You can now sign in with your new password.
              </AppText>
              <AppButton title="Back to sign in" onPress={backToLogin} />
            </>
          ) : null}
        </AppStack>
      </AppCard>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 36,
    gap: 24
  },
  header: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
    gap: 8
  },
  title: {
    textAlign: "center"
  },
  subtitle: {
    maxWidth: 390,
    textAlign: "center",
    lineHeight: 22
  },
  card: {
    width: "100%",
    maxWidth: 440,
    padding: 24,
    borderRadius: 24,
    borderColor: "#dbe6ec"
  },
  segment: {
    flexDirection: "row",
    gap: 6,
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100]
  },
  segmentOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentOptionActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.mutedText
  },
  segmentTextActive: {
    color: colors.white
  },
  centerLink: {
    alignSelf: "center",
    paddingVertical: 4
  },
  linkText: {
    color: colors.primary
  },
  disabledLink: {
    opacity: 0.55
  },
  disabledLinkText: {
    color: colors.softText
  },
  centerText: {
    textAlign: "center"
  },
  strengthTrack: {
    flexDirection: "row",
    gap: 6,
    marginTop: -8
  },
  strengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.border
  },
  strengthBarActive: {
    backgroundColor: colors.primary
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100]
  },
  successMark: {
    color: colors.primary
  }
});
