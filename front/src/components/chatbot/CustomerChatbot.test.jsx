import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiRequest } from "../../config/api";
import CustomerChatbot from "./CustomerChatbot";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));

test("customer chatbot keeps its UI and renders a contextual AI reply", async () => {
  apiRequest.mockResolvedValue({
    provider: "openai",
    reply: { text: "Open My Orders and choose Pay Again.", route: "/my-orders" },
  });
  render(<MemoryRouter initialEntries={["/shop"]}><CustomerChatbot /></MemoryRouter>);

  fireEvent.click(screen.getByRole("button", { name: "Open chatbot" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Chatbot input" }), {
    target: { value: "How do I retry GCash?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByText("Open My Orders and choose Pay Again.")).toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith("/ai/customer-chat", expect.objectContaining({ method: "POST" }));
  const payload = JSON.parse(apiRequest.mock.calls[0][1].body);
  expect(payload.message).toBe("How do I retry GCash?");
  expect(payload.currentPage).toBe("/shop");
});
