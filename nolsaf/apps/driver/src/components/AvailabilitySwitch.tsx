import { AppCard, AppStack, AppText, colors } from "@nolsaf/native-ui";
import { ActivityIndicator, Switch, View } from "react-native";
import { StyleSheet } from "react-native";

type AvailabilitySwitchProps = {
  available: boolean;
  loading?: boolean;
  onToggle: (next: boolean) => void;
};

export function AvailabilitySwitch({ available, loading, onToggle }: AvailabilitySwitchProps) {
  return (
    <AppCard tone={available ? "brand" : "default"} style={styles.card}>
      <View style={styles.row}>
        <AppStack gap={1} style={styles.text}>
          <AppText variant="title" weight="bold" tone={available ? "inverse" : "default"}>
            {available ? "You're online" : "You're offline"}
          </AppText>
          <AppText variant="bodySmall" tone={available ? "inverse" : "muted"}>
            {available ? "You can receive on demand trip requests now." : "Go online to start receiving trip requests."}
          </AppText>
        </AppStack>
        {loading ? (
          <ActivityIndicator color={available ? colors.white : colors.primary} />
        ) : (
          <Switch
            value={available}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.brand[400] }}
            thumbColor={colors.white}
          />
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  text: {
    flexShrink: 1,
    minWidth: 0
  }
});
