import { render, waitFor } from "@testing-library/react";
import { IncidentHeatMap } from "./IncidentHeatMap";

const bindTooltip = jest.fn();
jest.mock("leaflet", () => {
  const chain = () => ({ addTo: () => undefined, bindTooltip: (c: unknown) => (bindTooltip(c), { addTo: () => undefined }) });
  return {
    map: () => ({ fitBounds: jest.fn(), remove: jest.fn() }),
    tileLayer: chain,
    circleMarker: chain,
    latLngBounds: jest.fn(),
  };
});

it("renders area names as text, never as HTML", async () => {
  // Area comes from user-entered suburb/city/location; a string tooltip would be parsed as HTML.
  const area = '<img src=x onerror="alert(1)">';
  render(<IncidentHeatMap cells={[{ lat: -26.2, lng: 28.05, count: 2, area }]} />);

  await waitFor(() => expect(bindTooltip).toHaveBeenCalled());
  const content = bindTooltip.mock.calls[0][0];
  expect(content).toBeInstanceOf(HTMLElement);
  expect(content.textContent).toBe(`${area}: 2 incidents`);
  expect(content.querySelector("img")).toBeNull();
});
