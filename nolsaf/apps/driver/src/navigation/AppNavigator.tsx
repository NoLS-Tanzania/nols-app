import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@nolsaf/native-ui";

import { useAuth } from "../auth/AuthProvider";
import { getDriverGateState } from "../auth/driverGate";
import {
  ActionRequiredScreen,
  IncompleteOnboardingScreen,
  PendingReviewScreen,
  RejectedScreen,
  SuspendedScreen
} from "../screens/gate";
import { AccountScreen } from "../screens/AccountScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { EarningsScreen } from "../screens/EarningsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { RatingScreen } from "../screens/RatingScreen";
import { RemindersScreen } from "../screens/RemindersScreen";
import { ScheduledTripsScreen } from "../screens/ScheduledTripsScreen";
import { TripDetailScreen } from "../screens/TripDetailScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.surface,
    primary: colors.primary,
    card: colors.surface,
    text: colors.ink,
    border: colors.border
  }
};

export function AppNavigator() {
  const { status, user } = useAuth();

  const gateState = status === "authenticated" && user ? getDriverGateState(user) : "ok";

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface }
        }}
      >
        {status === "authenticated" && gateState === "ok" ? (
          <>
            <Stack.Screen name="Home" component={DashboardScreen} />
            <Stack.Screen name="Trips" component={TripsScreen} />
            <Stack.Screen name="Earnings" component={EarningsScreen} />
            <Stack.Screen name="Account" component={AccountScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="TripDetail" component={TripDetailScreen} />
            <Stack.Screen name="ScheduledTrips" component={ScheduledTripsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Reminders" component={RemindersScreen} />
            <Stack.Screen name="Rating" component={RatingScreen} />
          </>
        ) : status === "authenticated" ? (
          <>
            {gateState === "pending_kyc" ? <Stack.Screen name="Home" component={PendingReviewScreen} /> : null}
            {gateState === "action_required" ? <Stack.Screen name="Home" component={ActionRequiredScreen} /> : null}
            {gateState === "rejected" ? <Stack.Screen name="Home" component={RejectedScreen} /> : null}
            {gateState === "suspended" ? <Stack.Screen name="Home" component={SuspendedScreen} /> : null}
            {gateState === "incomplete_onboarding" ? (
              <Stack.Screen name="Home" component={IncompleteOnboardingScreen} />
            ) : null}
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
