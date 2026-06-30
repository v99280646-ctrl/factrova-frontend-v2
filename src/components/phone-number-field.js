import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    _jsxs("div", {
      className: `space-y-1.5 ${className}`.trim(),
      children: [
        _jsx(Label, { children: label }),
        _jsxs("div", {
          className: "grid grid-cols-[7rem_minmax(0,1fr)] gap-2",
          children: [
            _jsx(Input, {
              value: countryCode,
              onChange: (event) => onCountryCodeChange(event.target.value),
              placeholder: countryCodePlaceholder,
              inputMode: "tel",
              autoComplete: "tel-country-code",
            }),
            _jsx(Input, {
              value: phone,
              onChange: (event) => onPhoneChange(event.target.value),
              placeholder: phonePlaceholder,
              inputMode: "tel",
              autoComplete: "tel-national",
            }),
          ],
        }),
      ],
    })
  );
}
