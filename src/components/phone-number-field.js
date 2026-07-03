import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRY_CODES } from "@/utils/countryCodes";

export function PhoneNumberField({
  label,
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  className = "",
  countryCodePlaceholder = "+91",
  phonePlaceholder = "Enter number",
}) {
  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <Label>{label}</Label>
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-2">
        <select
          value={countryCode || countryCodePlaceholder}
          onChange={(event) => onCountryCodeChange(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          autoComplete="tel-country-code"
        >
          {COUNTRY_CODES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} {item.country}
            </option>
          ))}
        </select>
        <Input
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder={phonePlaceholder}
          inputMode="tel"
          autoComplete="tel-national"
        />
      </div>
    </div>
  );
}
