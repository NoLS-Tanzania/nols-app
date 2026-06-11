import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowRight, Calculator, Landmark, MapPin, WalletCards } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppButton, AppCard, AppStack, AppText, CustomerBottomNav, InfoGrid, SafeScreen, ScreenHeader } from "../components";
import { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "CostCalculator">;

export function CostCalculatorScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <SafeScreen contentStyle={styles.screen}>
        <AppStack gap={5}>
          <ScreenHeader
            title="Cost calculator"
            subtitle="Estimate stays, rides, tours and payment totals before booking."
          />

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Calculator color={colors.white} size={26} />
            </View>
            <AppStack gap={2} style={styles.heroText}>
              <AppText variant="title" weight="extraBold" tone="inverse">
                Clear cost before you commit.
              </AppText>
              <AppText variant="bodySmall" tone="inverse" style={styles.heroCopy}>
                Compare routes, booking types and supported payment channels in one customer-safe view.
              </AppText>
            </AppStack>
          </View>

          <InfoGrid
            items={[
              { label: "Estimate", value: "Stay + ride + tour" },
              { label: "Payment", value: "MNO, bank and card" },
              { label: "Visibility", value: "Fees shown upfront" }
            ]}
          />

          <AppCard>
            <AppStack gap={4}>
              <View style={styles.rowStart}>
                <MapPin color={colors.primary} size={22} />
                <AppText variant="titleSm" weight="bold">
                  Trip estimate
                </AppText>
              </View>
              <InfoGrid
                items={[
                  { label: "Pickup", value: "Dar es Salaam" },
                  { label: "Dropoff", value: "Zanzibar, Arusha or selected stay" }
                ]}
              />
              <AppButton
                title="Find destination"
                icon={<ArrowRight color={colors.white} size={18} />}
                onPress={() => navigation.navigate("Search")}
              />
            </AppStack>
          </AppCard>

          <AppCard tone="success">
            <AppStack gap={4}>
              <View style={styles.rowStart}>
                <WalletCards color={colors.primary} size={22} />
                <AppText variant="titleSm" weight="bold">
                  Payment-ready
                </AppText>
              </View>
              <AppText variant="bodySmall" tone="muted">
                The calculator will prepare totals for mobile money, bank transfer and card-supported booking flows.
              </AppText>
            </AppStack>
          </AppCard>

          <AppCard tone="warning">
            <AppStack gap={4}>
              <View style={styles.rowStart}>
                <Landmark color={colors.warning} size={22} />
                <AppText variant="titleSm" weight="bold">
                  NoLSAF charge view
                </AppText>
              </View>
              <AppText variant="bodySmall" tone="muted">
                Future estimates will separate provider amount, transport, NoLSAF service visibility and final payable.
              </AppText>
            </AppStack>
          </AppCard>
        </AppStack>
      </SafeScreen>

      <CustomerBottomNav active="CostCalculator" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  screen: {
    paddingBottom: spacing[4]
  },
  hero: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDeep,
    padding: spacing[5],
    overflow: "hidden"
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  heroText: {
    flex: 1
  },
  heroCopy: {
    color: "#d8e7e4"
  },
  rowStart: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  }
});
