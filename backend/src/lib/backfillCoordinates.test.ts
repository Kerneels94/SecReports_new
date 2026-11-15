import { backfillCoordinates, geocode } from "./backfillCoordinates";

const makeDb = (incidents: unknown[]) => ({
  incident: {
    findMany: jest.fn().mockResolvedValue(incidents),
    update: jest.fn().mockResolvedValue({}),
  },
});

describe("backfillCoordinates", () => {
  it("geocodes each area once, sets coordinates, and skips incidents that already have them", async () => {
    const db = makeDb([
      { id: "1", latitude: null, longitude: null, suburb: "Westville", city: "Durban", propertyAddress: "40 Main Road", location: null },
      { id: "2", latitude: null, longitude: null, suburb: "Westville", city: "Durban", propertyAddress: "50 Main Road", location: null },
      { id: "3", latitude: -29.8, longitude: 31.0, suburb: "Umhlanga", city: "Durban", propertyAddress: null, location: null },
      { id: "4", latitude: null, longitude: null, suburb: null, city: null, propertyAddress: "1 Nowhere St", location: null },
      { id: "5", latitude: null, longitude: null, suburb: null, city: null, propertyAddress: null, location: null },
    ]);
    const lookup = jest.fn(async (q: string) => (q === "Westville, Durban" ? { lat: -29.83, lng: 30.93 } : null));

    const result = await backfillCoordinates(db, lookup, 0);

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalledWith("Westville, Durban");
    expect(lookup).toHaveBeenCalledWith("1 Nowhere St");
    expect(db.incident.update).toHaveBeenCalledTimes(2);
    expect(db.incident.update).toHaveBeenCalledWith({ where: { id: "1" }, data: { latitude: -29.83, longitude: 30.93 } });
    expect(db.incident.update).toHaveBeenCalledWith({ where: { id: "2" }, data: { latitude: -29.83, longitude: 30.93 } });
    expect(result).toEqual({ updated: 2, noArea: 1, notFound: ["1 Nowhere St"] });
  });
});

describe("backfillCoordinates suburb fallback", () => {
  it("retries with the suburb alone when 'suburb, city' is not found", async () => {
    // e.g. Ballito is its own town in OSM, so "Ballito, Durban" finds nothing.
    const db = makeDb([
      { id: "1", latitude: null, longitude: null, suburb: "Ballito", city: "Durban", propertyAddress: null, location: null },
    ]);
    const lookup = jest.fn(async (q: string) => (q === "Ballito" ? { lat: -29.53, lng: 31.21 } : null));

    const result = await backfillCoordinates(db, lookup, 0);

    expect(lookup.mock.calls.map((c) => c[0])).toEqual(["Ballito, Durban", "Ballito"]);
    expect(db.incident.update).toHaveBeenCalledWith({ where: { id: "1" }, data: { latitude: -29.53, longitude: 31.21 } });
    expect(result).toEqual({ updated: 1, noArea: 0, notFound: [] });
  });
});

describe("geocode", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns the first Photon hit inside South Africa", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: [30.93, -29.83] } }] }),
    } as Response);

    await expect(geocode("Westville, Durban")).resolves.toEqual({ lat: -29.83, lng: 30.93 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=Westville%2C%20Durban");
    expect(String(fetchMock.mock.calls[0][0])).toContain("bbox=");
  });

  it("returns null when Photon finds nothing", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ features: [] }) } as Response);
    await expect(geocode("zzz")).resolves.toBeNull();
  });

  it("throws when Photon errors, so the run stops instead of marking every area not found", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(geocode("Westville")).rejects.toThrow("429");
  });
});
