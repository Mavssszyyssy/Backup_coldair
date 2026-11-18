import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiRequest } from "../../config/api";
import CustomerChatbot from "./CustomerChatbot";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: "Filipino" }) }));

test("customer chatbot keeps its UI and renders a contextual AI reply", async () => {
  let finishRequest;
  apiRequest.mockImplementation(() => new Promise((resolve) => { finishRequest = resolve; }));
  render(<MemoryRouter initialEntries={["/shop"]}><CustomerChatbot /></MemoryRouter>);

  const launcher = screen.getByRole("button", { name: "Buksan ang AEROPULSE assistant" });
  expect(launcher.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  fireEvent.click(launcher);
  expect(screen.getByText(/Magtanong tungkol sa stock ng aircon/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Tanong para sa assistant" }), {
    target: { value: "How do I retry GCash?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ipadala" }));

  expect(screen.getByRole("status")).toHaveTextContent("Nag-iisip ang AEROPULSE…");
  finishRequest({
    provider: "openai",
    reply: { text: "Open My Orders and choose Pay Again.", route: "/my-orders" },
  });
  expect(await screen.findByText("Open My Orders and choose Pay Again.")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith("/ai/customer-chat", expect.objectContaining({ method: "POST" }));
  const payload = JSON.parse(apiRequest.mock.calls[0][1].body);
  expect(payload.message).toBe("How do I retry GCash?");
  expect(payload.currentPage).toBe("/shop");
  expect(payload.language).toBe("Filipino");
});

test("the stock shortcut displays branch counts returned by the server", async () => {
  apiRequest.mockResolvedValueOnce({
    provider: "catalog",
    reply: { text: "May 8 available na unit sa Cavite.", route: "/shop" },
  });
  render(<MemoryRouter initialEntries={["/my-orders"]}><CustomerChatbot /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Buksan ang AEROPULSE assistant" }));
  fireEvent.click(screen.getByRole("button", { name: "Aling branch ang may pinakamaraming stock ng aircon?" }));
  expect(await screen.findByText("May 8 available na unit sa Cavite.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Buksan ang pahina" })).toBeInTheDocument();
  expect(JSON.parse(apiRequest.mock.lastCall[1].body).message).toBe("Which branch has the most AC stock?");
});

test("follow-up questions retain the customer's question and the assistant reply", async () => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValueOnce({
    provider: "catalog", reply: { text: "Here are the available AC models. What is your budget?", route: "/shop" },
  }).mockResolvedValueOnce({
    provider: "catalog", reply: { text: "Here are the AC options under your budget.", route: "/shop" },
  });
  render(<MemoryRouter initialEntries={["/shop"]}><CustomerChatbot /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Buksan ang AEROPULSE assistant" }));
  const input = screen.getByRole("textbox", { name: "Tanong para sa assistant" });
  fireEvent.change(input, { target: { value: "What is the best seller AC unit?" } });
  fireEvent.click(screen.getByRole("button", { name: "Ipadala" }));
  await screen.findByText("Here are the available AC models. What is your budget?");
  fireEvent.change(input, { target: { value: "but for you which one is the best?" } });
  fireEvent.click(screen.getByRole("button", { name: "Ipadala" }));
  await screen.findByText("Here are the AC options under your budget.");
  expect(JSON.parse(apiRequest.mock.lastCall[1].body)).toEqual(expect.objectContaining({
    message: "but for you which one is the best?",
    history: [
      { role: "user", content: "What is the best seller AC unit?" },
      { role: "assistant", content: "Here are the available AC models. What is your budget?" },
    ],
  }));
});
