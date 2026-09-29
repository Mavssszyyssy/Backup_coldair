import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import HistoryPagination from "./HistoryPagination";

test("pagination controls do not trigger a clickable parent", () => {
  const onPageChange = vi.fn();
  const onParentClick = vi.fn();

  render(
    <div onClick={onParentClick}>
      <HistoryPagination
        currentPage={1}
        totalPages={4}
        onPageChange={onPageChange}
        label="Assessment page"
      />
    </div>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Next assessment page" }));

  expect(onPageChange).toHaveBeenCalledWith(2);
  expect(onParentClick).not.toHaveBeenCalled();
});
