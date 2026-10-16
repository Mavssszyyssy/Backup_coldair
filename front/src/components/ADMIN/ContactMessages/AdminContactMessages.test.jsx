import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../config/api";
import AdminContactMessages from "./AdminContactMessages";

vi.mock("../../../config/api", () => ({ apiRequest: vi.fn() }));

const message = {
  id: "message-1",
  ticketCode: "MSG-001",
  category: "general",
  subject: "Need help",
  message: "Please help with my account.",
  customerName: "Test Customer",
  email: "customer@example.com",
  phone: "09123456789",
  branch: "Bulacan",
  source: "web",
  status: "new",
  adminReply: "",
  createdAt: "2026-10-17T01:00:00.000Z",
  timeline: [],
};

describe("AdminContactMessages reply composer", () => {
  beforeEach(() => {
    apiRequest.mockReset().mockImplementation(async (path, options = {}) => {
      if (path === "/contact-messages") return { messages: [message] };
      if (path === "/contact-messages/message-1" && options.method === "PATCH") {
        const payload = JSON.parse(options.body);
        return { message: { ...message, ...payload, timeline: [{ status: payload.status, note: payload.adminReply }] } };
      }
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  it("clears the reply field only after a successful send", async () => {
    render(<AdminContactMessages />);
    const reply = await screen.findByRole("textbox", { name: /reply to customer/i });
    fireEvent.change(reply, { target: { value: "  Your request is ready.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => expect(reply).toHaveValue(""));
    const patchCall = apiRequest.mock.calls.find(([, options]) => options?.method === "PATCH");
    expect(JSON.parse(patchCall[1].body).adminReply).toBe("Your request is ready.");
  });

  it("keeps the reply text when sending fails", async () => {
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/contact-messages") return { messages: [message] };
      if (options.method === "PATCH") throw new Error("Reply could not be sent");
      return {};
    });
    render(<AdminContactMessages />);
    const reply = await screen.findByRole("textbox", { name: /reply to customer/i });
    fireEvent.change(reply, { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reply" }));

    await screen.findByText("Reply could not be sent");
    expect(reply).toHaveValue("Keep this draft");
  });
});
