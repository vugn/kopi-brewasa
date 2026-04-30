export interface QRISValidationResult {
  valid: boolean;
  errors: string[];
}

export interface QRISConvertOptions {
  amount: number;
  fee?: {
    type: "fixed" | "percentage";
    value: number;
  };
}

interface TLV {
  tag: string;
  name: string;
  length: number;
  value: string;
  children?: TLV[];
}

function calculateCRC16(str: string): string {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

const TAG_NAMES: Record<string, string> = {
  "00": "Payload Format Indicator",
  "01": "Point of Initiation Method",
  "26": "Merchant Account Information",
  "27": "Merchant Account Information",
  "28": "Merchant Account Information",
  "29": "Merchant Account Information",
  "30": "Merchant Account Information",
  "31": "Merchant Account Information",
  "32": "Merchant Account Information",
  "33": "Merchant Account Information",
  "34": "Merchant Account Information",
  "35": "Merchant Account Information",
  "36": "Merchant Account Information",
  "37": "Merchant Account Information",
  "38": "Merchant Account Information",
  "39": "Merchant Account Information",
  "40": "Merchant Account Information",
  "41": "Merchant Account Information",
  "42": "Merchant Account Information",
  "43": "Merchant Account Information",
  "44": "Merchant Account Information",
  "45": "Merchant Account Information",
  "46": "Merchant Account Information",
  "47": "Merchant Account Information",
  "48": "Merchant Account Information",
  "49": "Merchant Account Information",
  "50": "Merchant Account Information",
  "51": "Merchant Account Information",
  "52": "Merchant Category Code",
  "53": "Transaction Currency",
  "54": "Transaction Amount",
  "55": "Tip or Convenience Indicator",
  "56": "Value of Convenience Fee (Fixed)",
  "57": "Value of Convenience Fee (%)",
  "58": "Country Code",
  "59": "Merchant Name",
  "60": "Merchant City",
  "61": "Postal Code",
  "62": "Additional Data Field",
  "63": "CRC",
};

const NESTED_TAGS = new Set([
  ...Array.from({ length: 26 }, (_, index) =>
    String(index + 26).padStart(2, "0"),
  ),
  "62",
]);

function parseTLV(data: string): TLV[] {
  const elements: TLV[] = [];
  let pos = 0;

  while (pos < data.length) {
    if (pos + 4 > data.length) break;

    const tag = data.substring(pos, pos + 2);
    const length = parseInt(data.substring(pos + 2, pos + 4), 10);

    if (Number.isNaN(length) || pos + 4 + length > data.length) break;

    const value = data.substring(pos + 4, pos + 4 + length);
    const element: TLV = {
      tag,
      name: TAG_NAMES[tag] ?? `Unknown (${tag})`,
      length,
      value,
    };

    if (NESTED_TAGS.has(tag)) {
      element.children = parseTLV(value);
    }

    elements.push(element);
    pos += 4 + length;
  }

  return elements;
}

function buildTLVString(elements: TLV[]): string {
  return elements
    .map((element) => {
      const value = element.children
        ? buildTLVString(element.children)
        : element.value;
      return `${element.tag}${value.length.toString().padStart(2, "0")}${value}`;
    })
    .join("");
}

function makeTLV(tag: string, value: string, name = ""): TLV {
  return { tag, name, length: value.length, value };
}

export function validateQRIS(qrisString: string): QRISValidationResult {
  const errors: string[] = [];

  if (!qrisString || qrisString.trim().length === 0) {
    return { valid: false, errors: ["QRIS string is empty"] };
  }

  const str = qrisString.trim();

  if (!str.startsWith("000201")) {
    errors.push('QRIS must start with Payload Format Indicator "000201"');
  }

  if (str.length < 20) {
    errors.push("QRIS string is too short");
    return { valid: false, errors };
  }

  const dataWithoutCRC = str.substring(0, str.length - 4);
  const declaredCRC = str.substring(str.length - 4);
  const calculatedCRC = calculateCRC16(dataWithoutCRC);

  if (declaredCRC.toUpperCase() !== calculatedCRC) {
    errors.push(
      `CRC mismatch: expected ${calculatedCRC}, got ${declaredCRC.toUpperCase()}`,
    );
  }

  const elements = parseTLV(str);
  if (elements.length === 0) {
    errors.push("Failed to parse any TLV elements");
    return { valid: false, errors };
  }

  const tags = new Set(elements.map((element) => element.tag));
  const requiredTags = ["00", "01", "52", "53", "58", "59", "60", "63"];

  for (const tag of requiredTags) {
    if (!tags.has(tag)) {
      errors.push(`Missing required tag ${tag}`);
    }
  }

  const method = elements.find((element) => element.tag === "01");
  if (method && method.value !== "11" && method.value !== "12") {
    errors.push(
      `Invalid Point of Initiation Method: "${method.value}" (must be "11" or "12")`,
    );
  }

  const hasMerchant = elements.some((element) => {
    const tagNumber = parseInt(element.tag, 10);
    return tagNumber >= 26 && tagNumber <= 51;
  });

  if (!hasMerchant) {
    errors.push("No Merchant Account Information found (tags 26-51)");
  }

  return { valid: errors.length === 0, errors };
}

export function convertQRIS(
  qrisString: string,
  options: QRISConvertOptions,
): string {
  const elements = parseTLV(qrisString.trim());
  const result: TLV[] = [];
  let amountInserted = false;
  const managedTags = new Set(["54", "55", "56", "57", "63"]);

  for (const element of elements) {
    if (managedTags.has(element.tag)) continue;

    if (element.tag === "01") {
      result.push(makeTLV("01", "12", "Point of Initiation Method"));
      continue;
    }

    if (element.tag === "58" && !amountInserted) {
      result.push(
        makeTLV("54", options.amount.toString(), "Transaction Amount"),
      );

      if (options.fee) {
        if (options.fee.type === "fixed") {
          result.push(makeTLV("55", "02", "Tip or Convenience Indicator"));
          result.push(
            makeTLV(
              "56",
              options.fee.value.toString(),
              "Value of Convenience Fee (Fixed)",
            ),
          );
        } else {
          result.push(makeTLV("55", "03", "Tip or Convenience Indicator"));
          result.push(
            makeTLV(
              "57",
              options.fee.value.toString(),
              "Value of Convenience Fee (%)",
            ),
          );
        }
      }

      amountInserted = true;
    }

    result.push(element);
  }

  const withoutCRC = buildTLVString(result);
  const crcInput = `${withoutCRC}6304`;
  return `${crcInput}${calculateCRC16(crcInput)}`;
}
