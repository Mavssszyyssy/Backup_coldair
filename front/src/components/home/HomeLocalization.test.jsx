import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import HomeHero from "./HomeHero";
import HomeBrands from "./HomeBrands";
import HomeInfo from "./HomeInfo";

let language = "Filipino";
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: language }) }));

test("customer home switches static copy while preserving partner names", () => {
  const content = () => <MemoryRouter>
    <HomeHero onShop={vi.fn()} onBookNow={vi.fn()} />
    <HomeBrands brands={[{ id: 1, name: "American Home", description: "Energy Efficient", logoUrl: "/brand.png" }]} />
    <HomeInfo />
  </MemoryRouter>;
  const { rerender } = render(content());

  expect(screen.getByRole("heading", { name: /Damhin ang sining ng/ })).toBeVisible();
  expect(screen.getByText("Matipid sa enerhiya")).toBeVisible();
  expect(screen.getByRole("link", { name: /American Home/ })).toHaveAttribute("href", "/shop?brand=American+Home");

  language = "English";
  rerender(content());
  expect(screen.getByRole("heading", { name: /Experience the Art of/ })).toBeVisible();
  expect(screen.getByText("Energy Efficient")).toBeVisible();
  language = "Filipino";
});
