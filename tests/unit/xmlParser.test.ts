// tests/unit/xmlParser.test.ts

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseXmlBatch } from "@/lib/parsers/xmlParser";

// Load the real fixture provided in the assignment repo
const fixtureXml = readFileSync(
  resolve(__dirname, "../fixtures/Container_68465468.xml"),
  "utf-8"
);

describe("parseXmlBatch — real fixture (Container_68465468.xml)", () => {
  it("parses all 17 parcels from the fixture", () => {
    const { parcels } = parseXmlBatch(fixtureXml);
    expect(parcels).toHaveLength(17);
  });

  it("extracts correct batchId", () => {
    const { batchId } = parseXmlBatch(fixtureXml);
    expect(batchId).toBe("68465468");
  });

  it("extracts correct weight for first parcel (Vinny Gankema)", () => {
    const { parcels } = parseXmlBatch(fixtureXml);
    expect(parcels[0].weight).toBe(0.02);
  });

  it("extracts correct recipient name despite 'Receipient' typo in schema", () => {
    const { parcels } = parseXmlBatch(fixtureXml);
    expect(parcels[0].recipient?.name).toBe("Vinny Gankema");
  });

  it("extracts correct value for Ricardus Proper (heavy + insurance)", () => {
    const { parcels } = parseXmlBatch(fixtureXml);
    const ricardus = parcels.find((p) => p.recipient?.name === "Ricardus Proper");
    expect(ricardus?.weight).toBe(100);
    expect(ricardus?.value).toBe(2000);
  });

  it("handles integer weight (Alvaro ten Cate — weight: 11)", () => {
    const { parcels } = parseXmlBatch(fixtureXml);
    const alvaro = parcels.find((p) => p.recipient?.name === "Alvaro ten Cate");
    expect(alvaro?.weight).toBe(11);
  });

  it("handles zero value correctly", () => {
    const { parcels } = parseXmlBatch(fixtureXml);
    const roland = parcels.find((p) => p.recipient?.name === "Roland Lubben");
    expect(roland?.value).toBe(0);
  });

  it("returns no errors for a valid file", () => {
    const { errors } = parseXmlBatch(fixtureXml);
    expect(errors).toHaveLength(0);
  });
});

describe("parseXmlBatch — error handling", () => {
  it("returns error for completely invalid XML", () => {
    const { parcels, errors } = parseXmlBatch("this is not xml <<<");
    expect(parcels).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error when Container root element is missing", () => {
    const { errors } = parseXmlBatch("<Root><Something /></Root>");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns empty parcels for empty Container", () => {
    const { parcels } = parseXmlBatch(
      `<?xml version="1.0"?><Container><Id>1</Id><parcels></parcels></Container>`
    );
    expect(parcels).toHaveLength(0);
  });

  it("handles a single Parcel (not wrapped in array by fast-xml-parser)", () => {
    const singleParcel = `<?xml version="1.0"?>
      <Container>
        <Id>1</Id>
        <parcels>
          <Parcel>
            <Receipient><Name>Solo Person</Name></Receipient>
            <Weight>3.0</Weight>
            <Value>0</Value>
          </Parcel>
        </parcels>
      </Container>`;
    const { parcels } = parseXmlBatch(singleParcel);
    expect(parcels).toHaveLength(1);
    expect(parcels[0].weight).toBe(3);
  });
});