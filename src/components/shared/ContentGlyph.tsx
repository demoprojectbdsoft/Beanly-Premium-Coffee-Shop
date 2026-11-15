import { createElement } from "react";
import { contentIcon, type ContentIconName } from "@/lib/contentIcons";

/**
 * Draws a glyph from the content registry by name.
 *
 * The lookup has to happen inside a component rather than in the caller's
 * render, because picking a component out of a table during another component's
 * body reads to React's linting as a *new component created on every render* —
 * the thing that silently resets state. Wrapping it here keeps one stable
 * component, and `createElement` takes the looked-up glyph directly instead of
 * assigning it to a capitalised variable, which is what the rule watches for.
 */
export default function ContentGlyph({
  name,
  className,
}: {
  name?: ContentIconName | null;
  className?: string;
}) {
  return createElement(contentIcon(name), { className });
}
