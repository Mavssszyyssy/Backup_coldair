import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Shop from "./Shop";
import { apiRequest } from "../../config/api";

const authState = vi.hoisted(() => ({ authenticated: false }));
vi.mock("react-router-dom", async (original) => ({
  ...(await original()),
  useLocation: () => ({ search: "" }),
  useNavigate: () => vi.fn(),
}));
vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../domain/branches/branchRouting", () => ({ resolveConfiguredBranch: vi.fn().mockResolvedValue("Cavite") }));
vi.mock("../../context/CartContext", () => ({ useCart: () => ({
  cart: [], addToCart: vi.fn(), updateQuantity: vi.fn(), removeFromCart: vi.fn(),
  getCartCount: () => 0, getCartTotal: () => 0,
}) }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({
  user: null, isAuthenticated: authState.authenticated, logout: vi.fn(),
  showAuthRequiredPrompt: vi.fn(), currentLanguage: "English",
}) }));
vi.mock("../common/boutique/BoutiqueScreen", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../common/boutique/BoutiqueBox", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../common/boutique/BoutiqueCart", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueFooter", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueHeader", () => ({ default: ({ subtitle }) => <div>{subtitle}</div> }));
vi.mock("../common/boutique/BoutiqueNotifications", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueSideMenu", () => ({ default: () => null }));
vi.mock("./ShopCatalogue", () => ({ default: () => null }));
vi.mock("./ShopSidebar", () => ({ default: () => null }));
vi.mock("./ProductModal", () => ({ default: () => null }));

beforeEach(() => {
  vi.useFakeTimers();
  apiRequest.mockReset();
  authState.authenticated = false;
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});
afterEach(() => vi.useRealTimers());

test("catalogue polling coalesces a slow request and pauses while hidden", async () => {
  let finishFirst;
  apiRequest.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
    .mockResolvedValue({ products: [] });
  const view = render(<Shop />);
  expect(apiRequest).toHaveBeenCalledTimes(1);

  await act(async () => { vi.advanceTimersByTime(40000); });
  expect(apiRequest).toHaveBeenCalledTimes(1);

  await act(async () => { finishFirst({ products: [] }); });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(apiRequest).toHaveBeenCalledTimes(1);

  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(apiRequest).toHaveBeenCalledTimes(2);
  view.unmount();
});

test("an older anonymous response cannot replace branch-specific stock after sign-in", async () => {
  let finishAnonymous;
  apiRequest.mockImplementation((path) => {
    if (path === "/products/public") return new Promise((resolve) => { finishAnonymous = resolve; });
    if (path === "/users/addresses") return Promise.resolve({ addresses: [{ city: "Bacoor", isDefault: true }] });
    if (path === "/products/public?branch=Cavite") return Promise.resolve({ products: [] });
    throw new Error(`Unexpected path: ${path}`);
  });
  const view = render(<Shop />);
  authState.authenticated = true;
  await act(async () => { view.rerender(<Shop />); });
  expect(view.getByText(/Cavite delivery branch/)).toBeInTheDocument();
  await act(async () => { finishAnonymous({ products: [] }); });
  expect(view.getByText(/Cavite delivery branch/)).toBeInTheDocument();
  view.unmount();
});
