# Feature 1: Canvas Text Clipper — Persistent Reading Panel

## What It Does

The Canvas Text Clipper is a browser extension that lets students highlight and save pieces of text from any Canvas page into a small floating panel that stays visible as they navigate the rest of the site. The panel can be minimized, scrolled through, and closed at will, and it persists across page loads until the user dismisses it.

A student might clip a key definition from a module page, a due date detail from an assignment, and an important line from a rubric — then keep all three visible in the panel while drafting their work or filling out a submission form elsewhere on Canvas.

## Problem It Addresses

Canvas surfaces a lot of important information across many different pages — assignment descriptions, rubric criteria, module instructions, announcements — but it offers no way to hold onto a piece of that content while navigating elsewhere. Students frequently find themselves flipping back and forth between pages to re-read instructions, losing their place, or copying text into a separate notes app just to keep it in view.

The Canvas Text Clipper solves this by letting students keep relevant excerpts from Canvas itself visible without leaving the platform or juggling multiple tabs.

## Why This Feature

This feature was selected because it addresses a real, recurring friction point in how students actually use Canvas day-to-day. It doesn't require Canvas to change — it layers on top of existing Canvas pages in a lightweight, non-destructive way. The scope is well-defined: there's a clear trigger (highlight text, clip it), a clear output (floating panel with saved clips), and a clear interaction model (panel persists, user closes it when done).

It's also a meaningful improvement over the workaround most students already use — manually copying text into a notes app — because it keeps everything in one place and requires almost no effort.

## Scope and Feasibility

This is a medium-sized project. The core pieces are:

- A **text selection and clipping mechanism** — the user highlights text on a Canvas page and clicks a button or uses a keyboard shortcut to save it
- A **floating panel UI** — a small, draggable window that displays saved clips in a scrollable list
- **Cross-page persistence** — clips survive Canvas page navigation using `localStorage`, so no backend is needed
- A **browser extension wrapper** — the most practical delivery method, as it allows the extension to inject the panel UI and interact with Canvas page content without requiring LTI integration or Canvas admin access

None of these pieces are deeply complex on their own. The trickiest part is ensuring the panel and its state survive correctly across Canvas's mix of full page loads and single-page-app navigation, which requires some care but is well within scope for a medium project.

## Out of Scope (for now)

- Organizing or labeling clips by course or assignment
- Syncing clips across devices
- Editing or annotating clips after saving
- Any backend or server component
