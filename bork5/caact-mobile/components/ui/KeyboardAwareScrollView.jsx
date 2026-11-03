import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, TextInput } from "react-native";

export const focusedFieldScrollOffset = ({ fieldTop, fieldHeight, viewportTop, viewportHeight, scrollY }) => {
  const below = fieldTop + fieldHeight - (viewportTop + viewportHeight - 32);
  const above = fieldTop - (viewportTop + 16);
  const delta = below > 0 ? below : above < 0 ? above : 0;
  return Math.max(0, scrollY + delta);
};

// A small shared wrapper for long mobile forms. Android resizes the window
// through app.json; iOS receives keyboard insets here. Both platforms scroll
// the focused input into view so a bottom field is never hidden behind the
// keyboard or a sticky action bar.
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  {
    children,
    contentContainerStyle,
    minBottomPadding = 112,
    keyboardExtraOffset = 28,
    onScroll,
    ...props
  },
  forwardedRef,
) {
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(Infinity);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useImperativeHandle(forwardedRef, () => scrollRef.current);

  const scrollFocusedInputIntoView = useCallback(() => {
    // Measure both native views in window coordinates. measureLayout against a
    // ScrollView ref is not supported consistently by Android and iOS.
    if (Platform.OS === "web") return;
    const target = TextInput.State.currentlyFocusedInput?.();
    if (!target?.measureInWindow || !scrollRef.current?.measureInWindow) return;
    requestAnimationFrame(() => {
      target.measureInWindow((_x, fieldTop, _width, fieldHeight) => {
        scrollRef.current?.measureInWindow((_scrollX, scrollTop, _scrollWidth, scrollHeight) => {
          if (!Number.isFinite(fieldTop) || !Number.isFinite(scrollTop)) return;
          const visibleHeight = Math.min(scrollHeight, Math.max(0, keyboardTopRef.current - scrollTop));
          if (!visibleHeight) return;
          const nextY = focusedFieldScrollOffset({
            fieldTop, fieldHeight, viewportTop: scrollTop,
            viewportHeight: visibleHeight, scrollY: scrollYRef.current,
          });
          if (nextY !== scrollYRef.current) scrollRef.current?.scrollTo({ y: nextY, animated: true });
        });
      });
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (event) => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
      keyboardTopRef.current = event?.endCoordinates?.screenY ?? Infinity;
      requestAnimationFrame(scrollFocusedInputIntoView);
    };
    const onHide = () => {
      keyboardTopRef.current = Infinity;
      setKeyboardHeight(0);
    };
    const showListener = Keyboard.addListener(showEvent, onShow);
    const didShowListener = Platform.OS === "ios" ? Keyboard.addListener("keyboardDidShow", onShow) : null;
    const hideListener = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showListener.remove();
      didShowListener?.remove();
      hideListener.remove();
    };
  }, [scrollFocusedInputIntoView]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      onFocus={scrollFocusedInputIntoView}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      scrollEventThrottle={16}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: Math.max(minBottomPadding, Platform.OS === "ios" ? keyboardHeight + keyboardExtraOffset : minBottomPadding) },
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
});

export default KeyboardAwareScrollView;
