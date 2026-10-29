import { render } from "@testing-library/react";
import PostHogScript from "./PostHogScript";

jest.mock("next/script", () => ({
  __esModule: true,
  default: ({
    strategy,
    dangerouslySetInnerHTML,
  }: {
    strategy: string;
    dangerouslySetInnerHTML: { __html: string };
  }) => (
    <script
      data-testid="posthog-script"
      data-strategy={strategy}
      data-snippet={dangerouslySetInnerHTML.__html}
    />
  ),
}));

describe("PostHogScript", () => {
  it("loads after hydration so it does not block first paint", () => {
    const { getByTestId } = render(<PostHogScript />);
    expect(getByTestId("posthog-script")).toHaveAttribute(
      "data-strategy",
      "afterInteractive",
    );
  });

  it("only initialises PostHog when analytics consent was accepted", () => {
    const { getByTestId } = render(<PostHogScript />);
    const snippet = getByTestId("posthog-script").getAttribute("data-snippet");
    expect(snippet).toContain("cookieConsent");
    expect(snippet).toContain("posthog.init(");
  });
});
