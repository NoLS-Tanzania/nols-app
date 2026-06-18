import { AppText, AppTextProps } from "./AppText";

type AmountTextProps = AppTextProps & {
  amount: number;
  currency?: string;
};

// Hermes does not always include the full Intl number formatter, so
// `toLocaleString()` can silently skip thousands separators on-device.
function formatAmount(amount: number) {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function AmountText({ amount, currency = "TZS", ...props }: AmountTextProps) {
  return (
    <AppText variant="title" weight="bold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} {...props}>
      {formatAmount(amount)} {currency}
    </AppText>
  );
}
