import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiRequest } from "../../config/api";
import MyOrders from "./MyOrders";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ isAuthenticated: true, currentLanguage: "English" }) }));
vi.mock("../../context/CartContext", () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock("../common/boutique/BoutiqueHeader", () => ({ default: () => null }));

test("the loading skeleton appears before the backend confirms that order history is empty", async () => {
  let finish;
  apiRequest.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<MemoryRouter><MyOrders /></MemoryRouter>);

  expect(screen.getByText("Loading orders...")).toBeInTheDocument();
  expect(screen.queryByText("No Orders Yet")).not.toBeInTheDocument();
  await act(() => finish({ orders: [] }));
  expect(screen.getByText("No Orders Yet")).toBeInTheDocument();
  expect(screen.queryByText("Loading orders...")).not.toBeInTheDocument();
});

test("an empty filtered result does not tell the customer they have never ordered", async () => {
  apiRequest.mockResolvedValue({ orders: [] });
  render(<MemoryRouter initialEntries={["/my-orders?status=to_deliver"]}><MyOrders /></MemoryRouter>);

  expect(await screen.findByText("No matching orders")).toBeInTheDocument();
  expect(screen.queryByText("No Orders Yet")).not.toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("orderStatus=to_deliver"));
});
