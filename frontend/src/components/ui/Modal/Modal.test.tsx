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
});
