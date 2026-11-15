import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import SearchableSelect from "./SearchableSelect";

afterEach(() => { cleanup(); vi.restoreAllMocks(); delete document.documentElement.dataset.language; });

function Fixture({ onChange, disabled = false }) {
  const [value, setValue] = useState("");
  return <form>
    <label>Technician
    <SearchableSelect name="technician" value={value} required disabled={disabled} onChange={(event) => {
      setValue(event.target.value);
      onChange(event.target.value);
    }}>
      <option value="">Select a technician</option>
      {Array.from({ length: 7 }, (_, i) => <option key={i} value={`tech-${i}`}>Technician {i}</option>)}
      <optgroup label="Cavite">
        <option value="tech-jose">José Reyes</option>
        <option value="tech-disabled" disabled>Busy Technician</option>
      </optgroup>
    </SearchableSelect>
    </label>
  </form>;
}

function openSearch(label = "Search options") {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 48, top: 70, bottom: 114, width: 220 });
  fireEvent.click(screen.getByRole("button", { name: label }));
  return within(screen.getByRole("dialog", { name: label }));
}

it("keeps a short required list as a native dropdown", () => {
  render(<SearchableSelect required aria-label="Priority"><option value="1">Low</option><option value="2">High</option></SearchableSelect>);
  expect(screen.getByRole("combobox", { name: "Priority" })).toBeRequired();
  expect(screen.queryByRole("button", { name: "Search options" })).toBeNull();
});

it("finds a choice by accent-insensitive label, code and group, then fires the native change once", () => {
  const onChange = vi.fn();
  render(<Fixture onChange={onChange} />);
  const dropdown = screen.getByRole("combobox", { name: "Technician" });
  expect(dropdown.checkValidity()).toBe(false);
  const popup = openSearch();
  const search = popup.getByRole("searchbox");
  expect(search).toHaveFocus();
  fireEvent.change(search, { target: { value: "cavite JOSE tech-jose" } });
  expect(popup.queryByRole("button", { name: "Technician 1" })).toBeNull();
  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(popup.getByRole("button", { name: /José Reyes/ })).toHaveFocus();
  fireEvent.click(popup.getByRole("button", { name: /José Reyes/ }));
  expect(dropdown).toHaveValue("tech-jose");
  expect(dropdown.checkValidity()).toBe(true);
  expect(new FormData(dropdown.form).get("technician")).toBe("tech-jose");
  expect(onChange).toHaveBeenCalledExactlyOnceWith("tech-jose");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Search options" })).toHaveFocus();
});

it("preserves disabled choices and resets the localized search on reopen", () => {
  document.documentElement.dataset.language = "Filipino";
  const label = "Maghanap ng pagpipilian";
  const onChange = vi.fn();
  const { rerender } = render(<Fixture onChange={onChange} />);
  const popup = openSearch(label);
  const search = popup.getByRole("searchbox");
  expect(popup.getByRole("button", { name: /Busy Technician/ })).toBeDisabled();
  fireEvent.change(search, { target: { value: "missing" } });
  expect(popup.getByRole("status")).toHaveTextContent("Walang nakitang tumutugmang tala.");
  fireEvent.keyDown(search, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(screen.getByRole("searchbox")).toHaveValue("");
  rerender(<Fixture onChange={onChange} disabled />);
  expect(screen.getByRole("button", { name: label })).toBeDisabled();
  expect(onChange).not.toHaveBeenCalled();
});
