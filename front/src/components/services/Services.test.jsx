import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Services from "./Services";

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

function renderServices() {
  return render(
    <MemoryRouter initialEntries={["/services"]}>
      <Services />
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe("Customer Services screen", () => {
  it("keeps service creation in mobile while presenting the existing web options", () => {
    renderServices();

    expect(screen.getByRole("heading", { level: 2, name: "Services" })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 1,
      name: "Manage AC services in the AeroPulse Mobile App",
    })).toBeInTheDocument();
    expect(screen.getByText("MOBILE APP ONLY")).toBeInTheDocument();
    expect(screen.getByText("Maintenance and repairs")).toBeInTheDocument();
    expect(screen.getByText("Warranty support")).toBeInTheDocument();
    expect(screen.getByText("Live request updates")).toBeInTheDocument();
    expect(screen.getByText(/website does not create service or warranty requests/i)).toBeInTheDocument();
  });

  it("preserves every existing Services navigation action", () => {
    renderServices();

    fireEvent.click(screen.getByRole("button", { name: "View My AC Units" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/myunit");

    fireEvent.click(screen.getByRole("button", { name: "Contact Support" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/contact");

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/home");
  });
});
