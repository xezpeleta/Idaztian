import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Ilunabar Dark Theme — Obsidian-inspired dark theme for Idaztian.
 * "Ilunabar" means "dark moon" in Basque.
 */

const colors = {
    bg: '#1e1e1e',
    bgPanel: '#181818',
    bgCode: '#2b2b2b',
    bgSelection: '#264f78',
    bgActiveLine: '#2a2a2a',
    text: '#dcddde',
    textMuted: '#888',
    textFaint: '#555',
    accent: '#7f6df2',
    accentHover: '#9d8ff5',
    heading: '#e8e8e8',
    link: '#7f6df2',
    code: '#e06c75',
    codeAlt: '#98c379',
    string: '#98c379',
    keyword: '#c678dd',
    number: '#d19a66',
    comment: '#5c6370',
    cursor: '#aeafb0',
    border: '#333',
    hr: '#444',
};

export const ilunabarDarkTheme = EditorView.theme(
    {
        '&': {
            color: colors.text,
            backgroundColor: colors.bg,
            fontSize: '16px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            height: '100%',
        },
        '.cm-content': {
            caretColor: colors.cursor,
            padding: '16px 0',
            lineHeight: '1.7',
            maxWidth: '860px',
            margin: '0 auto',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: colors.cursor,
            borderLeftWidth: '2px',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: colors.bgSelection,
        },
        '.cm-activeLine': {
            backgroundColor: colors.bgActiveLine,
        },
        '.cm-activeLineGutter': {
            backgroundColor: colors.bgActiveLine,
        },
        '.cm-gutters': {
            backgroundColor: colors.bgPanel,
            color: colors.textFaint,
            border: 'none',
            borderRight: `1px solid ${colors.border}`,
        },
        '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 8px',
            minWidth: '32px',
        },
        '.cm-scroller': {
            fontFamily: 'inherit',
            overflowY: 'auto',
        },
        '.cm-placeholder': {
            color: colors.textFaint,
            fontStyle: 'italic',
        },

        // ── Heading styles ──────────────────────────────────────────────────
        '.idz-h1': {
            fontSize: '2em',
            fontWeight: '700',
            color: colors.heading,
            lineHeight: '1.3',
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: '0.2em',
            marginBottom: '0.5em',
        },
        '.idz-h2': {
            fontSize: '1.6em',
            fontWeight: '700',
            color: colors.heading,
            lineHeight: '1.35',
        },
        '.idz-h3': {
            fontSize: '1.3em',
            fontWeight: '600',
            color: colors.heading,
        },
        '.idz-h4': {
            fontSize: '1.1em',
            fontWeight: '600',
            color: colors.heading,
        },
        '.idz-h5': {
            fontSize: '1em',
            fontWeight: '600',
            color: colors.textMuted,
        },
        '.idz-h6': {
            fontSize: '0.9em',
            fontWeight: '600',
            color: colors.textMuted,
        },
        '.idz-heading-marker': {
            color: colors.accent,
            fontWeight: '700',
        },

        // ── Emphasis styles ─────────────────────────────────────────────────
        '.idz-bold': {
            fontWeight: '700',
        },
        '.idz-italic': {
            fontStyle: 'italic',
        },
        '.idz-bold-italic': {
            fontWeight: '700',
            fontStyle: 'italic',
        },
        '.idz-strikethrough': {
            textDecoration: 'line-through',
            color: colors.textMuted,
        },

        // ── Marker (visible syntax tokens) ─────────────────────────────────
        '.idz-marker': {
            color: colors.text,
        },
        // Force inner lezer spans (e.g. punctuation) to inherit our color
        '.idz-marker *': {
            color: 'inherit',
        },

        // ── Links ───────────────────────────────────────────────────────────
        '.idz-link': {
            color: colors.link,
            textDecoration: 'underline',
            textDecorationColor: `${colors.link}66`,
            cursor: 'pointer',
        },
        '.idz-link:hover': {
            color: colors.accentHover,
            textDecorationColor: colors.accentHover,
        },
        '.idz-link-syntax': {
            color: colors.link,
        },
        '.idz-image-syntax': {
            color: colors.textMuted,
        },
        '.idz-image': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            display: 'block',
            margin: '0.5em 0',
        },

        // ── Code ────────────────────────────────────────────────────────────
        '.idz-inline-code': {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: '0.9em',
            color: colors.code,
            backgroundColor: colors.bgCode,
            padding: '0.1em 0.35em',
            borderRadius: '3px',
        },
        // Per-line code block classes — stitched together to look like one block
        '.idz-code-line': {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: '0.9em',
            backgroundColor: colors.bgCode,
            borderLeft: `3px solid ${colors.accent}`,
            paddingLeft: '1em',
            paddingRight: '1em',
            display: 'block',
        },
        '.idz-code-first': {
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            paddingTop: '0.75em',
            position: 'relative',
        },
        '.idz-code-last': {
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            paddingBottom: '0.75em',
        },
        '.idz-code-middle': {
            // no extra rounding — seamlessly connects to adjacent lines
        },

        // ── Copy button ─────────────────────────────────────────────────────
        '.idz-copy-btn': {
            position: 'absolute',
            top: '0.45em',
            right: '0.6em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35em',
            padding: '0.2em 0.55em',
            border: 'none',
            borderRadius: '4px',
            background: 'transparent',
            color: colors.textMuted,
            fontSize: '0.78em',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            cursor: 'pointer',
            lineHeight: '1',
            transition: 'background 0.15s ease, color 0.15s ease',
            userSelect: 'none',
            zIndex: '10',
        },
        '.idz-copy-btn:hover': {
            background: 'rgba(255,255,255,0.08)',
            color: colors.text,
        },
        '.idz-copy-btn:active': {
            background: 'rgba(255,255,255,0.14)',
        },
        '.idz-copy-btn__label': {
            display: 'inline-flex',
            alignItems: 'center',
        },
        '.idz-copy-btn__hint': {
            opacity: '0',
            maxWidth: '0',
            overflow: 'hidden',
            transition: 'opacity 0.15s ease, max-width 0.15s ease',
            whiteSpace: 'nowrap',
            fontSize: '0.9em',
            color: colors.textMuted,
        },
        '.idz-copy-btn:hover .idz-copy-btn__hint': {
            opacity: '1',
            maxWidth: '3em',
        },
        // Fence line hidden (cursor away) — collapse the line visually
        '.idz-fence-hidden': {
            fontSize: '0',
            lineHeight: '0',
            overflow: 'hidden',
            padding: '0',
            margin: '0',
            opacity: '0',
            height: '0',
            display: 'block',
        },
        '.idz-fence-marker-line': {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: '0.9em',
            backgroundColor: colors.bgCode,
            borderLeft: `3px solid ${colors.accent}`,
            paddingLeft: '1em',
            color: colors.textFaint,
            opacity: '0.7',
        },

        // ── Toast notification ───────────────────────────────────────────────
        // Injected into document.body by the copy button widget
        // Note: CM6 EditorView.theme() only scopes styles inside the editor DOM,
        // so we add a global <style> tag for the toast instead (see code.ts).
        // The rule below is kept here for documentation; the actual injection
        // happens via a separate globalToastStyle extension.

        // ── Lists ───────────────────────────────────────────────────────────
        '.idz-bullet': {
            color: colors.accent,
            fontWeight: '700',
            marginRight: '0.5em',
            userSelect: 'none',
        },
        '.idz-ordered-marker': {
            color: colors.accent,
            fontWeight: '600',
        },
        '.idz-checkbox': {
            accentColor: colors.accent,
            width: '14px',
            height: '14px',
            marginRight: '0.5em',
            cursor: 'pointer',
            verticalAlign: 'middle',
        },

        // ── Blockquotes ─────────────────────────────────────────────────────
        '.idz-blockquote': {
            borderLeft: `3px solid ${colors.accent}`,
            paddingLeft: '1em',
            color: colors.text,
            margin: '0.5em 0',
        },
        '.idz-blockquote-line': {
            borderLeft: `3px solid ${colors.accent}`,
            paddingLeft: '1em',
            color: colors.text,
        },

        // ── Horizontal rule ─────────────────────────────────────────────────
        '.idz-hr': {
            border: 'none',
            borderTop: `1px solid ${colors.hr}`,
            margin: '1.5em 0',
        },
        // When cursor is away, the line gets this class — we hide the text
        // and show a visual rule via CSS
        '.idz-hr-line': {
            fontSize: '0',
            lineHeight: '0.1em',
            overflow: 'hidden',
            borderTop: `1px solid ${colors.hr}`,
            margin: '0.75em 0',
            display: 'block',
        },
        '.idz-hr-syntax': {
            color: colors.textFaint,
        },

        // ── Alerts / Callouts ────────────────────────────────────────────────
        '.idz-alert-line': {
            paddingLeft: '1.1em',
            paddingRight: '1em',
            borderLeft: '3px solid',
            margin: '0',
            color: colors.text,
            fontStyle: 'normal',
        },
        '.idz-alert-first': {
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            paddingTop: '0.55em',
            marginTop: '0.85em',
        },
        '.idz-alert-last': {
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            paddingBottom: '0.55em',
            marginBottom: '0.85em',
        },
        '.idz-alert-header': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45em',
            fontWeight: '600',
            fontStyle: 'normal',
            fontSize: '0.9em',
            lineHeight: '1',
        },
        '.idz-alert-icon': {
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: '0',
        },
        '.idz-alert-icon svg': {
            display: 'block',
        },
        '.idz-alert-type-syntax': {
            fontWeight: '600',
            fontStyle: 'normal',
        },
        // NOTE — blue
        '.idz-alert-note': {
            borderLeftColor: '#4493f8',
            backgroundColor: 'rgba(68, 147, 248, 0.1)',
        },
        '.idz-alert-header-note': {
            color: '#4493f8',
        },
        // TIP — green
        '.idz-alert-tip': {
            borderLeftColor: '#3fb950',
            backgroundColor: 'rgba(63, 185, 80, 0.1)',
        },
        '.idz-alert-header-tip': {
            color: '#3fb950',
        },
        // IMPORTANT — purple
        '.idz-alert-important': {
            borderLeftColor: '#a371f7',
            backgroundColor: 'rgba(163, 113, 247, 0.1)',
        },
        '.idz-alert-header-important': {
            color: '#a371f7',
        },
        // WARNING — amber
        '.idz-alert-warning': {
            borderLeftColor: '#d29922',
            backgroundColor: 'rgba(210, 153, 34, 0.1)',
        },
        '.idz-alert-header-warning': {
            color: '#e3a426',
        },
        // CAUTION — red
        '.idz-alert-caution': {
            borderLeftColor: '#f85149',
            backgroundColor: 'rgba(248, 81, 73, 0.1)',
        },
        '.idz-alert-header-caution': {
            color: '#f85149',
        },

        // ── Footnotes ────────────────────────────────────────────────────────
        '.idz-footnote-ref': {
            color: colors.accent,
            fontSize: '0.75em',
            verticalAlign: 'super',
            lineHeight: '0',
            cursor: 'default',
            fontWeight: '600',
        },
        '.idz-footnote-ref-syntax': {
            color: colors.accent,
        },
        '.idz-footnote-def': {
            color: colors.textMuted,
            fontSize: '0.9em',
            fontWeight: '600',
        },

        // ── Math / LaTeX ─────────────────────────────────────────────────────
        '.idz-math-inline': {
            display: 'inline-block',
            verticalAlign: 'middle',
        },
        '.idz-math-block': {
            display: 'block',
            textAlign: 'center',
            padding: '0.5em 0',
            overflowX: 'auto',
        },
        '.idz-math-syntax': {
            color: colors.codeAlt,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '0.9em',
        },
        '.idz-math-loading': {
            color: colors.textFaint,
            fontStyle: 'italic',
        },
        '.idz-math-error': {
            color: '#f85149',
            fontStyle: 'italic',
        },

        // ── Search panel (CM6 built-in) ──────────────────────────────────────
        '.cm-search': {
            backgroundColor: colors.bgPanel,
            borderTop: `1px solid ${colors.border}`,
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
        },
        '.cm-search input': {
            backgroundColor: colors.bgCode,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '13px',
            outline: 'none',
        },
        '.cm-search input:focus': {
            borderColor: colors.accent,
        },
        '.cm-search button': {
            backgroundColor: 'transparent',
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '12px',
            cursor: 'pointer',
        },
        '.cm-search button:hover': {
            backgroundColor: colors.bgCode,
            color: colors.text,
        },
        '.cm-search label': {
            color: colors.textMuted,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
        },
        '.cm-searchMatch': {
            backgroundColor: 'rgba(127, 109, 242, 0.3)',
            borderRadius: '2px',
        },
        '.cm-searchMatch.cm-searchMatch-selected': {
            backgroundColor: 'rgba(127, 109, 242, 0.6)',
        },

        // ── Tables (always-rendered widget) ─────────────────────────────────
        // Outer: block-level scroll container (handles wide tables + margin).
        '.idz-table-outer': {
            display: 'block',
            maxWidth: '100%',
            margin: '0.75em 0',
            overflowX: 'auto',
        },
        // Wrapper: inline-flex so it shrinks to the table's actual content width.
        // This keeps the add-col lane flush against the table's right edge.
        '.idz-table-wrapper': {
            display: 'inline-flex',
            alignItems: 'stretch',
            minWidth: '0',
        },
        '.idz-table': {
            borderCollapse: 'collapse',
            fontSize: '0.95em',
            lineHeight: '1.6',
            width: 'auto',
            minWidth: '200px',
        },

        // ── Regular header / data cells ──────────────────────────────────────
        '.idz-table-th, .idz-table-td': {
            border: `1px solid ${colors.border}`,
            padding: '6px 14px',
            textAlign: 'left',
            verticalAlign: 'top',
            minWidth: '80px',
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
        },
        '.idz-table-th': {
            backgroundColor: 'rgba(127, 109, 242, 0.12)',
            color: colors.heading,
            fontWeight: '600',
            borderBottomColor: colors.accent,
            cursor: 'text',
        },
        '.idz-table-td': {
            cursor: 'text',
        },
        '.idz-table-th:focus, .idz-table-td:focus': {
            backgroundColor: 'rgba(127, 109, 242, 0.08)',
            boxShadow: `inset 0 0 0 2px ${colors.accent}`,
            outline: 'none',
        },
        '.idz-table tbody tr:not(.idz-table-ghost-row):hover td.idz-table-td': {
            backgroundColor: 'rgba(255,255,255,0.03)',
        },

        // ── Add-column lane: flex sibling of the table, same height via align-items stretch ─
        '.idz-table-add-col-lane': {
            width: '26px',
            flexShrink: '0',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            padding: '0 4px',
            opacity: '0',
            transition: 'opacity 0.15s ease',
            pointerEvents: 'none',
        },
        '.idz-table-wrapper:hover .idz-table-add-col-lane': {
            opacity: '1',
            pointerEvents: 'auto',
        },

        // ── Ghost row (last row in tbody, hidden until hover) ────────────────
        '.idz-table-ghost-row': {
            height: '24px',
        },
        '.idz-table-ghost-row td': {
            border: 'none',
            padding: '2px 0',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.15s ease',
            pointerEvents: 'none',
            backgroundColor: 'transparent',
        },
        '.idz-table:hover .idz-table-ghost-row td': {
            opacity: '1',
            pointerEvents: 'auto',
        },

        // ── Add column / row buttons ─────────────────────────────────────────
        '.idz-table-add-btn': {
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `1px dashed ${colors.accent}`,
            background: colors.bg,
            color: colors.accent,
            fontSize: '15px',
            lineHeight: '1',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            transition: 'background 0.1s ease, color 0.1s ease',
            verticalAlign: 'middle',
        },
        '.idz-table-add-btn:hover': {
            background: colors.accent,
            color: '#fff',
        },
        '.idz-table-add-btn--row': {
            width: '100%',
            borderRadius: '4px',
            height: '18px',
            fontSize: '13px',
        },
        // Full-height dashed rectangle, mirroring the full-width add-row button.
        // Must come AFTER the base .idz-table-add-btn rule to override height/radius.
        '.idz-table-add-btn--col': {
            width: '18px',
            height: 'auto',     // override base 22px; flex align-items:stretch fills the rest
            alignSelf: 'stretch',
            borderRadius: '4px',
            fontSize: '13px',
        },
        // ── Toolbar ──────────────────────────────────────────────────────────
        '.idz-toolbar': {
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2px',
            padding: '6px 10px',
            backgroundColor: colors.bgPanel,
            borderBottom: `1px solid ${colors.border}`,
        },
        '.idz-toolbar-btn': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '28px',
            padding: '0',
            border: 'none',
            borderRadius: '4px',
            background: 'transparent',
            color: colors.textMuted,
            cursor: 'pointer',
            transition: 'background 0.1s ease, color 0.1s ease',
            flexShrink: '0',
        },
        '.idz-toolbar-btn:hover': {
            background: 'rgba(255,255,255,0.08)',
            color: colors.text,
        },
        '.idz-toolbar-btn:active': {
            background: 'rgba(255,255,255,0.14)',
        },
        '.idz-toolbar-btn--active': {
            background: `rgba(127, 109, 242, 0.2)`,
            color: colors.accent,
        },
        '.idz-toolbar-btn--active:hover': {
            background: `rgba(127, 109, 242, 0.3)`,
            color: colors.accentHover,
        },
        '.idz-toolbar-sep': {
            width: '1px',
            height: '18px',
            backgroundColor: colors.border,
            margin: '0 4px',
            flexShrink: '0',
        },

        // Note: context menu styles are injected globally by context-menu.ts
        // (EditorView.theme() scopes to the editor container; the menu lives in document.body)

        // ── CM6 panel wrapper (toolbar host) ─────────────────────────────────
        '.cm-panels-top': {
            borderBottom: 'none',
        },
    },
    { dark: true }
);

export const ilunabarHighlightStyle = syntaxHighlighting(
    HighlightStyle.define([
        { tag: t.heading1, class: 'idz-h1' },
        { tag: t.heading2, class: 'idz-h2' },
        { tag: t.heading3, class: 'idz-h3' },
        { tag: t.heading4, class: 'idz-h4' },
        { tag: t.heading5, class: 'idz-h5' },
        { tag: t.heading6, class: 'idz-h6' },
        { tag: t.strong, fontWeight: 'bold' },
        { tag: t.emphasis, fontStyle: 'italic' },
        { tag: t.strikethrough, textDecoration: 'line-through' },
        { tag: t.link, color: colors.link },
        { tag: t.url, color: colors.link },
        { tag: t.monospace, fontFamily: 'monospace', color: colors.code },
        { tag: t.string, color: colors.string },
        { tag: t.keyword, color: colors.keyword },
        { tag: t.comment, color: colors.comment, fontStyle: 'italic' },
        { tag: t.number, color: colors.number },
        { tag: t.bool, color: colors.number },
        { tag: t.null, color: colors.number },
        { tag: t.operator, color: colors.text },
        { tag: t.punctuation, color: colors.textMuted },
        { tag: t.meta, color: colors.textFaint },
        { tag: t.invalid, color: '#ff5555' },
    ])
);

export function ilunabarDark() {
    return [ilunabarDarkTheme, ilunabarHighlightStyle];
}
