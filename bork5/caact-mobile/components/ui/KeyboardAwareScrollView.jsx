import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, TextInput, UIManager, findNodeHandle } from "react-native";

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
    ...props
  },
  forwardedRef,
) {
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useImperativeHandle(forwardedRef, () => scrollRef.current);

  const scrollFocusedInputIntoView = useCallback((node) => {
    const target = node || TextInput.State.currentlyFocusedInput?.();
    const scrollNode = findNodeHandle(scrollRef.current);
    const targetNode = findNodeHandle(target);
    if (!scrollNode || !targetNode) return;

    requestAnimationFrame(() => {
      UIManager.measureLayout(
        targetNode,
        scrollNode,
        (_left, top) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, top - 72), animated: true });
        },
        () => {},
      );
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (event) => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
      scrollFocusedInputIntoView();
    };
    const onHide = () => setKeyboardHeight(0);
    const showListener = Keyboard.addListener(showEvent, onShow);
    const hideListener = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [scrollFocusedInputIntoView]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      onFocus={(event) => scrollFocusedInputIntoView(event?.target)}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: Math.max(minBottomPadding, keyboardHeight + keyboardExtraOffset) },
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
});

export default KeyboardAwareScrollView;
