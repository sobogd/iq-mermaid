"use client";

import { Component, type ReactNode } from "react";

// Reusable error boundary.
//
// The editor is now the shared background of every marketing page, mounted
// inside the SAME React root as the page UI (layout-level, under the closable
// content window). Without a boundary, a render error inside the ~500 kB
// mermaid editor unmounts that shared root — and the whole marketing page
// silently degrades to static SSR HTML: content still scrolls, but no button
// anywhere responds. Wrapping the editor layer in a boundary keeps any editor
// failure local to the desktop area instead.
//
// Behaviour on error: transient hiccups recover on their own — the subtree is
// retried a couple of times with a short backoff (a fresh mount after the
// error is often all it takes). If it still fails, the subtree stays unmounted
// (the desktop area shows the empty wallpaper); the page chrome and the
// closable window are untouched, so the visitor never loses the site.
export class SafeArea extends Component<
  { children: ReactNode; retries?: number; retryDelayMs?: number },
  { failed: boolean; attempts: number }
> {
  state = { failed: false, attempts: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[iqm] editor layer crashed, isolating and retrying:", error);
  }

  componentDidUpdate(_prevProps: unknown, prevState: { failed: boolean; attempts: number }) {
    const { retries = 2, retryDelayMs = 1200 } = this.props;
    if (this.timer) return; // a retry is already scheduled
    if (this.state.failed && !prevState.failed && this.state.attempts <= retries) {
      const attempt = this.state.attempts + 1;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.setState({ failed: false, attempts: attempt });
      }, retryDelayMs * attempt);
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  render() {
    const { retries = 2 } = this.props;
    if (this.state.failed && this.state.attempts > retries) return null;
    // While failed (and between retries) render nothing: the wallpaper/desktop
    // shows through, and the marketing chrome keeps working.
    if (this.state.failed) return null;
    return this.props.children;
  }
}
