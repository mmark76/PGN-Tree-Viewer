type RequestFrame = (callback: FrameRequestCallback) => number;
type CancelFrame = (handle: number) => void;

export type AnimationFrameScheduler = {
  schedule: () => void;
  cancel: () => void;
};

/** Coalesces any number of updates into at most one callback per animation frame. */
export function createAnimationFrameScheduler(
  callback: () => void,
  requestFrame: RequestFrame,
  cancelFrame: CancelFrame,
): AnimationFrameScheduler {
  let frameHandle: number | null = null;

  return {
    schedule() {
      if (frameHandle !== null) return;
      frameHandle = requestFrame(() => {
        frameHandle = null;
        callback();
      });
    },
    cancel() {
      if (frameHandle === null) return;
      cancelFrame(frameHandle);
      frameHandle = null;
    },
  };
}
