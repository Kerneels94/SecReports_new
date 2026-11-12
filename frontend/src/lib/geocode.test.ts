import { googleMapsUrl, searchAddress, toSuggestion } from "./geocode";

const feature = (properties: Record<string, string>, coordinates: [number, number] = [28.06, -26.05]) => ({
  geometry: { coordinates },
  properties,
});

describe("toSuggestion", () => {
  it("builds street, suburb, city and swaps Photon's [lng, lat] order", () => {
    const s = toSuggestion(
      feature({ countrycode: "ZA", housenumber: "12", street: "Oak Ave", district: "Rivonia", city: "Sandton", postcode: "2128" }),
    );
    expect(s).toEqual({
      label: "12 Oak Ave, Rivonia, Sandton, 2128",
      street: "12 Oak Ave",
      suburb: "Rivonia",
      city: "Sandton",
      lat: -26.05,
      lng: 28.06,
    });
  });

  it("drops results outside South Africa", () => {
    expect(toSuggestion(feature({ countrycode: "BW", name: "Gaborone" }))).toBeNull();
  });

  it("falls back to the place name and locality/county when street data is missing", () => {
    const s = toSuggestion(feature({ countrycode: "za", name: "Menlyn Mall", locality: "Menlyn", county: "Tshwane" }));
    expect(s).toMatchObject({ street: "Menlyn Mall", suburb: "Menlyn", city: "Tshwane", label: "Menlyn Mall, Menlyn, Tshwane" });
  });
});

describe("searchAddress", () => {
  afterEach(() => jest.restoreAllMocks());

  it("skips the network for queries under 3 characters", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    expect(await searchAddress(" ab ")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("queries Photon inside the South Africa bounding box", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [feature({ countrycode: "ZA", name: "Rivonia" })] }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const res = await searchAddress("Rivonia Rd");
    expect(fetchSpy.mock.calls[0][0]).toContain("https://photon.komoot.io/api/?q=Rivonia%20Rd");
    expect(fetchSpy.mock.calls[0][0]).toContain("bbox=16.3,-35.0,33.0,-22.0");
    expect(res).toHaveLength(1);
  });

  it("throws when Photon fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(searchAddress("Rivonia")).rejects.toThrow("Address search failed");
  });
});

describe("googleMapsUrl", () => {
  it("builds a keyless Google Maps search link", () => {
    expect(googleMapsUrl(-26.05, 28.06)).toBe("https://www.google.com/maps/search/?api=1&query=-26.05,28.06");
  });
});
