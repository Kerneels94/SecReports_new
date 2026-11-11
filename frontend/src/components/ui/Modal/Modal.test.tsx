import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from ".";

describe("Modal", () => {
  it("does not render when closed", () => {
    render(<Modal open={false} onClose={jest.fn()}>Content</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(<Modal open={true} onClose={jest.fn()} title="Confirm">Content</Modal>);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("renders content when open without title", () => {
    render(<Modal open={true} onClose={jest.fn()}>Content</Modal>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("calls onClose when escape is pressed", async () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose}>Content</Modal>);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose}>Content</Modal>);
    const backdrop = screen.getByRole("dialog").children[0];
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Title">Content</Modal>);
    const closeBtn = screen.getByLabelText("Close");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("sets aria-modal on dialog", () => {
    render(<Modal open={true} onClose={jest.fn()}>Content</Modal>);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("sets aria-label from title", () => {
    render(<Modal open={true} onClose={jest.fn()} title="Confirm Delete">Content</Modal>);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Confirm Delete");
  });

  it("does not lock body scroll when closed", () => {
    render(<Modal open={false} onClose={jest.fn()}>Content</Modal>);
    expect(document.body.style.overflow).toBe("");
  });

  it("portals the dialog to document.body, outside the render container", () => {
    const { container } = render(<Modal open={true} onClose={jest.fn()}>Content</Modal>);
    const dialog = screen.getByRole("dialog");
    // Rendering inline would put it back inside <main>'s stacking context,
    // where the sidebar covers it.
    expect(dialog.parentElement).toBe(document.body);
    expect(container).not.toContainElement(dialog);
  });

  it("moves focus into the dialog on open", () => {
    render(
      <Modal open={true} onClose={jest.fn()} title="Edit">
        <input aria-label="Name" />
      </Modal>,
    );
    // The close button is the first focusable element in the panel.
    expect(screen.getByLabelText("Close")).toHaveFocus();
  });

  it("focuses the panel itself when it has nothing focusable", () => {
    render(<Modal open={true} onClose={jest.fn()}>Read only</Modal>);
    expect(screen.getByText("Read only")).toHaveFocus();
  });

  it("keeps Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Behind</button>
        <Modal open={true} onClose={jest.fn()} title="Edit">
          <input aria-label="Name" />
          <button>Save</button>
        </Modal>
      </>,
    );

    expect(screen.getByLabelText("Close")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    await user.tab(); // wraps instead of escaping to "Behind"
    expect(screen.getByLabelText("Close")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
  });

  it("returns focus to the trigger on close", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Edit">
            <input aria-label="Name" />
          </Modal>
        </>
      );
    }
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByLabelText("Close")).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });

  it("keeps focus where the user is typing when the parent re-renders", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("");
      // Inline onClose: a new function every render.
      return (
        <Modal open={true} onClose={() => {}} title="Edit">
          <input aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
        </Modal>
      );
    }
    render(<Harness />);

    await user.click(screen.getByLabelText("Name"));
    await user.keyboard("abc");

    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveValue("abc");
  });
});
