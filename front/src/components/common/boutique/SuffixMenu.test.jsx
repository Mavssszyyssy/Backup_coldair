import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import BoutiqueSideMenu from "./BoutiqueSideMenu";
import SideMenu from "../../home/SideMenu";

const state = vi.hoisted(() => ({ user: null }));
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: state.user, isAuthenticated: true, currentLanguage: "English" }),
}));
afterEach(cleanup);

test("both customer menus show the saved suffix and immediately reflect profile updates", () => {
  state.user = { name: "Patricks Tuparr", name_first: "Patricks", name_last: "Tuparr", suffix: "Jr.", role: "customer" };
  const menus = () => <MemoryRouter>
    <SideMenu isOpen onClose={() => {}} />
    <BoutiqueSideMenu isOpen onClose={() => {}} user={state.user} isAuthenticated />
  </MemoryRouter>;
  const view = render(menus());
  expect(screen.getAllByText("Patricks Tuparr Jr.")).toHaveLength(2);
  expect(screen.getAllByText("PT")).toHaveLength(2);
  state.user = { ...state.user, suffix: "III" };
  view.rerender(menus());
  expect(screen.getAllByText("Patricks Tuparr III")).toHaveLength(2);
  expect(screen.queryByText("Patricks Tuparr Jr.")).not.toBeInTheDocument();
  expect(screen.getAllByText("PT")).toHaveLength(2);
});
