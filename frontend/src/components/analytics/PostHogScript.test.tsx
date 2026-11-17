import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";
import PostHogScript from "./PostHogScript";

jest.mock("next/script", () => ({
  __esModule: true,
  default: (props: { strategy: string; src?: string; dangerouslySetInnerHTML?: unknown }) => (
    <script
      data-testid="posthog-script"
      data-strategy={props.strategy}
      data-src={props.src}
      data-inline={String(Boolean(props.dangerouslySetInnerHTML))}
    />
  ),
}));

describe("PostHogScript", () => {
  it("loads after hydration so it does not block first paint", () => {
    const { getByTestId } = render(<PostHogScript />);
    expect(getByTestId("posthog-script")).toHaveAttribute("data-strategy", "afterInteractive");
  });

  it("loads from a same-origin file, not inline, so the CSP needs no 'unsafe-inline'", () => {
    const { getByTestId } = render(<PostHogScript />);
    expect(getByTestId("posthog-script")).toHaveAttribute("data-src", "/posthog-init.js");
    expect(getByTestId("posthog-script")).toHaveAttribute("data-inline", "false");
  });

  it("only initialises PostHog when analytics consent was accepted", () => {
    const file = readFileSync(join(process.cwd(), "public/posthog-init.js"), "utf8");
    expect(file).toContain("cookieConsent");
    expect(file).toContain("posthog.init(");
  });
});
