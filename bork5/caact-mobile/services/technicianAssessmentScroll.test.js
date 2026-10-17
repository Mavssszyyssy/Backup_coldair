import { scrollToAssessmentPager } from "./technicianAssessmentScroll";

test("measures the assessment against ScrollView's native content ref", () => {
  const nativeContentRef = { native: true };
  const scrollView = {
    getInnerViewRef: jest.fn(() => nativeContentRef),
    getInnerViewNode: jest.fn(() => 42),
    scrollTo: jest.fn(),
  };
  const pager = { measureLayout: jest.fn((relativeTo, onSuccess) => onSuccess(0, 240)) };

  expect(scrollToAssessmentPager(scrollView, pager, 12)).toBe(true);
  expect(pager.measureLayout).toHaveBeenCalledWith(nativeContentRef, expect.any(Function), expect.any(Function));
  expect(scrollView.getInnerViewNode).not.toHaveBeenCalled();
  expect(scrollView.scrollTo).toHaveBeenCalledWith({ y: 228, animated: true });
});

test("does not attempt layout measurement before native refs are available", () => {
  const pager = { measureLayout: jest.fn() };
  expect(scrollToAssessmentPager({ getInnerViewRef: () => null }, pager, 12)).toBe(false);
  expect(pager.measureLayout).not.toHaveBeenCalled();
});
