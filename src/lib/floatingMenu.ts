// Shared positioning logic for portal-rendered row-action menus that need
// to escape an `overflow-hidden` table card. Three callers today (customers,
// products, staff). Inputs are the trigger button's bounding rect and the
// menu's width plus an estimated height — outputs viewport-fixed `top`/`left`
// with two safety rails:
//
//   - Vertical flip: when there's not enough room under the trigger to fit
//     the menu, place the menu above the trigger instead. Prevents the menu
//     from being clipped at the viewport bottom on short screens.
//   - Horizontal clamp: keep the menu inside the viewport with a small
//     padding when right-aligning to a trigger near the right edge.
//
// The estimated height is intentionally pessimistic (default 200) — if the
// actual menu is shorter we'll occasionally flip earlier than strictly
// needed, but the alternative (measure-then-reposition) costs a layout
// thrash and a visible reflow on every open.

export type FloatingMenuPos = { top: number; left: number };

type TriggerRect = { top: number; bottom: number; right: number };

type Options = {
  menuWidth: number;
  estimatedMenuHeight?: number;
  gap?: number;
  viewportPadding?: number;
};

export function computeFloatingMenuPos(
  trigger: TriggerRect,
  opts: Options,
): FloatingMenuPos {
  const {
    menuWidth,
    estimatedMenuHeight = 200,
    gap = 4,
    viewportPadding = 8,
  } = opts;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const roomBelow = vh - trigger.bottom - gap - viewportPadding;
  const top =
    roomBelow >= estimatedMenuHeight
      ? trigger.bottom + gap
      : Math.max(viewportPadding, trigger.top - estimatedMenuHeight - gap);

  const left = Math.min(
    vw - menuWidth - viewportPadding,
    Math.max(viewportPadding, trigger.right - menuWidth),
  );

  return { top, left };
}
