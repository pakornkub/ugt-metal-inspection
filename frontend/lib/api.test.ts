import { describe, expect, it } from "vitest";
import { parseLotCaseNumber } from "./api";

describe("parseLotCaseNumber", () => {
  it("splits a raw 9-digit string into lot (6) + case (3)", () => {
    expect(parseLotCaseNumber("123456789")).toEqual({
      lotNo: "123456",
      caseNo: "789",
    });
  });

  it("parses JSON QR payloads with lot_no/case_no", () => {
    expect(parseLotCaseNumber('{"lot_no":"123456","case_no":"789"}')).toEqual({
      lotNo: "123456",
      caseNo: "789",
    });
  });

  it("returns null when fewer than 9 digits are present", () => {
    expect(parseLotCaseNumber("12345")).toBeNull();
  });
});
