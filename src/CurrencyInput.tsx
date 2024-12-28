// src/CurrencyInput.tsx
import React from "react";
import MaskedInput, { MaskedInputProps } from "react-text-mask";
import createNumberMask from "text-mask-addons/dist/createNumberMask";

const defaultMaskOptions = {
  prefix: "$",
  suffix: "",
  includeThousandsSeparator: true,
  thousandsSeparatorSymbol: ",",
  allowDecimal: true,
  decimalSymbol: ".",
  decimalLimit: 2, // how many digits allowed after the decimal
  integerLimit: 7, // how many digits for the integer part
  allowNegative: false,
  allowLeadingZeroes: false,
};

export interface CurrencyInputProps
  extends Omit<MaskedInputProps, "mask" | "onChange" | "value"> {
  /**
   * The actual string to display. e.g. "$1,234.56" or typed partial.
   */
  value?: string;

  /**
   * Called when user changes the input. We'll pass back the event,
   * so you can do `setValue(e.target.value)`.
   */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;

  /**
   * Additional mask options to merge with defaultMaskOptions.
   */
  maskOptions?: Partial<typeof defaultMaskOptions>;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value = "",
  onChange,
  maskOptions,
  ...inputProps
}) => {
  // Merge user’s mask options with our defaults
  const finalMaskOptions = { ...defaultMaskOptions, ...maskOptions };
  const currencyMask = createNumberMask(finalMaskOptions);

  return (
    <MaskedInput
      mask={currencyMask}
      value={value}
      onChange={onChange}
      // Add "form-control" to get Bootstrap styling
      className="form-control"
      {...inputProps}
    />
  );
};

export default CurrencyInput;
