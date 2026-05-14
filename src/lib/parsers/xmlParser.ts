import { XMLParser } from 'fast-xml-parser';
import { Parcel } from '@/core/engine/types';

const parser = new XMLParser({ ignoreAttributes: false });

export interface ParseResult {
  parcels: Parcel[];
  batchId: string;
  shippingDate?: string;
  errors: string[];
}

export function parseXmlBatch(xmlContent: string): ParseResult {
  const errors: string[] = [];

  let parsed: any;
  try {
    parsed = parser.parse(xmlContent);
  } catch {
    return { parcels: [], batchId: 'unknown', errors: ['Invalid XML structure'] };
  }

  const container = parsed?.Container;
  if (!container) {
    return { parcels: [], batchId: 'unknown', errors: ['Missing <Container> root element'] };
  }

  const rawParcels = container?.parcels?.Parcel;
  const parcelArray = Array.isArray(rawParcels) ? rawParcels : [rawParcels].filter(Boolean);

  const parcels: Parcel[] = parcelArray.map((raw: any, index: number) => {
    // NOTE: Their XML uses "Receipient" (misspelled) — we match their schema exactly
    const recipient = raw?.Receipient;

    const weight = parseFloat(raw?.Weight);
    const value = parseFloat(raw?.Value ?? 0);

    if (isNaN(weight)) {
      errors.push(`Parcel at index ${index}: invalid Weight value "${raw?.Weight}"`);
    }

    return {
      weight: isNaN(weight) ? 0 : weight,
      value: isNaN(value) ? 0 : value,
      recipient: recipient ? {
        name: recipient?.Name ?? '',
        address: {
          street: recipient?.Address?.Street,
          houseNumber: String(recipient?.Address?.HouseNumber ?? ''),
          postalCode: recipient?.Address?.PostalCode,
          city: recipient?.Address?.City,
        },
      } : undefined,
    };
  });

  return {
    parcels,
    batchId: String(container?.Id ?? 'unknown'),
    shippingDate: container?.ShippingDate,
    errors,
  };
}
