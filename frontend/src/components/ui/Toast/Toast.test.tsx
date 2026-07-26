import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from ".";

function TestConsumer() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast("Patrol started", "success")}>Success</button>
      <button onClick={() => addToast("Patrol failed", "danger")}>Danger</button>
      <button onClick={() => addToast("Info message", "info", 0)}>Persistent</button>
    </div>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders a toast when addToast is called", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => {
      screen.getByText("Success").click();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Patrol started");
  });

  it("auto-dismisses toast after duration", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText("Success").click();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dismisses toast on button click", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText("Danger").click();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Patrol failed");

    act(() => {
      screen.getByRole("button", { name: /dismiss notification/i }).click();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not auto-dismiss when duration is 0", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText("Persistent").click();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("throws when useToast is used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation();
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow("useToast must be used within a ToastProvider");
    spy.mockRestore();
  });
});
