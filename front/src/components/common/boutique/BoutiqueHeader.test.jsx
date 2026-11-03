import { fireEvent, render, screen } from "@testing-library/react";
import BoutiqueHeader from "./BoutiqueHeader";

let currentLanguage = "English";
vi.mock("../../../context/UserContext", () => ({ useUser: () => ({ currentLanguage }) }));

beforeEach(() => { currentLanguage = "English"; });

test("customer header hides a cart control when the page has no cart action", () => {
  render(<BoutiqueHeader title="Settings" onLeftAction={() => {}} />);
  expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open cart" })).not.toBeInTheDocument();
});

test("customer header preserves the functional cart action", () => {
  const onCartClick = vi.fn();
  render(<BoutiqueHeader title="Shop" onLeftAction={() => {}} onCartClick={onCartClick} cartCount={2} />);
  fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
  expect(onCartClick).toHaveBeenCalledTimes(1);
  expect(screen.getByText("2")).toBeInTheDocument();
});

test("customer header names its menu and alert controls", () => {
  render(
    <BoutiqueHeader
      title="Home"
      leftAction="menu"
      onLeftAction={() => {}}
      isAuthenticated
      onNotificationClick={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open alerts" })).toBeInTheDocument();
});

test("customer header switches action labels in both directions", () => {
  currentLanguage = "Filipino";
  const view = render(<BoutiqueHeader title="Shop AC Units" onLeftAction={() => {}} onCartClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Bumalik" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Buksan ang cart" })).toBeInTheDocument();
  view.unmount();
  currentLanguage = "English";
  render(<BoutiqueHeader title="Shop AC Units" onLeftAction={() => {}} onCartClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
});
