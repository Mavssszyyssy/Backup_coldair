// React Native's ScrollView exposes both a numeric inner node handle and the
// native inner View ref. View.measureLayout requires the latter on Android.
export function scrollToAssessmentPager(scrollView, pager, topSpacing = 0) {
  const contentRef = scrollView?.getInnerViewRef?.();
  if (!pager || !contentRef) return false;

  pager.measureLayout(
    contentRef,
    (_x, y) => scrollView.scrollTo({ y: Math.max(0, y - topSpacing), animated: true }),
    () => {},
  );
  return true;
}
