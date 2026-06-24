import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppBottomNav, AppBottomNavItem } from "@nolsaf/native-ui";
import { Car, Home, UserCircle, Wallet } from "lucide-react-native";
import { ReactNode } from "react";

import { RootStackParamList } from "../navigation/types";

type DriverNavRoute = "Home" | "Trips" | "Earnings" | "Account";

type DriverBottomNavProps = {
  active: DriverNavRoute;
};

type NavItem = {
  route: DriverNavRoute;
  label: string;
  icon: (color: string) => ReactNode;
};

const navItems: NavItem[] = [
  {
    route: "Home",
    label: "Home",
    icon: (color) => <Home color={color} size={21} strokeWidth={2.4} />
  },
  {
    route: "Trips",
    label: "Trips",
    icon: (color) => <Car color={color} size={21} strokeWidth={2.4} />
  },
  {
    route: "Earnings",
    label: "Earnings",
    icon: (color) => <Wallet color={color} size={21} strokeWidth={2.4} />
  },
  {
    route: "Account",
    label: "Account",
    icon: (color) => <UserCircle color={color} size={21} strokeWidth={2.4} />
  }
];

export function DriverBottomNav({ active }: DriverBottomNavProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  function openRoute(route: DriverNavRoute) {
    if (route === active) return;
    navigation.navigate(route);
  }

  const items: Array<AppBottomNavItem<DriverNavRoute>> = navItems.map((item) => ({
    key: item.route,
    label: item.label,
    icon: item.icon,
    onPress: () => openRoute(item.route)
  }));

  return <AppBottomNav activeKey={active} items={items} />;
}
