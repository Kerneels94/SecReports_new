import { googleMapsUrl, searchAddress, toSuggestion, typedHouseNumber } from "./geocode";

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

describe("typed house number", () => {
  it("reads the leading number, with an optional letter", () => {
    expect(typedHouseNumber("25 alan road")).toBe("25");
    expect(typedHouseNumber(" 25a Alan Road")).toBe("25a");
    expect(typedHouseNumber("alan road 25")).toBeUndefined();
    expect(typedHouseNumber("2nd Avenue")).toBeUndefined();
  });

  it("keeps the typed number on a street-only result", () => {
    const s = toSuggestion(
      feature({ countrycode: "ZA", type: "street", osm_key: "highway", name: "Alan Road", district: "Eldoraigne", city: "Centurion" }),
      "25",
    );
    expect(s).toMatchObject({ street: "25 Alan Road", label: "25 Alan Road, Eldoraigne, Centurion" });
  });

  it("prefers Photon's own house number over the typed one", () => {
    const s = toSuggestion(feature({ countrycode: "ZA", type: "house", housenumber: "27", street: "Alan Road" }), "25");
    expect(s?.street).toBe("27 Alan Road");
  });

  it("does not put the typed number on a place that is not a street", () => {
    const s = toSuggestion(feature({ countrycode: "ZA", type: "other", name: "Menlyn Mall" }), "25");
    expect(s?.street).toBe("Menlyn Mall");
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

  it("passes the typed house number through to street results", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [feature({ countrycode: "ZA", type: "street", name: "Alan Road", district: "Eldoraigne" })],
      }),
    }) as unknown as typeof fetch;

    const [s] = await searchAddress("25 alan road eldoraigne");
    expect(s.street).toBe("25 Alan Road");
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
