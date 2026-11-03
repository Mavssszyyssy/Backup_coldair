import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import HomeHero from "./HomeHero";
import HomeBrands from "./HomeBrands";
import HomeInfo from "./HomeInfo";

let language = "Filipino";
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: language }) }));

test("customer home switches static copy while preserving partner names", () => {
  const { rerender } = render(<>
    <HomeHero onShop={vi.fn()} onBookNow={vi.fn()} />
    <HomeBrands brands={[{ id: 1, name: "Midea", description: "Energy Efficient", logoUrl: "/midea.png" }]} />
    <HomeInfo />
  </>);

  expect(screen.getByRole("heading", { name: /Damhin ang sining ng/ })).toBeVisible();
  expect(screen.getByText("Matipid sa enerhiya")).toBeVisible();
  expect(screen.getByText("Midea")).toBeVisible();

  language = "English";
  rerender(<>
    <HomeHero onShop={vi.fn()} onBookNow={vi.fn()} />
    <HomeBrands brands={[{ id: 1, name: "Midea", description: "Energy Efficient", logoUrl: "/midea.png" }]} />
    <HomeInfo />
  </>);
  expect(screen.getByRole("heading", { name: /Experience the Art of/ })).toBeVisible();
  expect(screen.getByText("Energy Efficient")).toBeVisible();
  language = "Filipino";
});
