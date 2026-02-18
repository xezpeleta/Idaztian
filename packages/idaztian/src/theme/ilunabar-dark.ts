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
            color: colors.textMuted,
            fontStyle: 'italic',
            margin: '0.5em 0',
        },
        '.idz-blockquote-line': {
            borderLeft: `3px solid ${colors.accent}`,
            paddingLeft: '1em',
            color: colors.textMuted,
            fontStyle: 'italic',
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
            paddingLeft: '1em',
            borderLeft: '3px solid',
            margin: '0',
        },
        '.idz-alert-header': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4em',
            fontWeight: '600',
            fontStyle: 'normal',
            fontSize: '0.9em',
            paddingBottom: '0.1em',
        },
        '.idz-alert-icon': {
            fontSize: '1em',
        },
        '.idz-alert-type-syntax': {
            fontWeight: '600',
            fontStyle: 'normal',
        },
        // NOTE — blue
        '.idz-alert-note': {
            borderLeftColor: '#2f81f7',
            backgroundColor: 'rgba(47, 129, 247, 0.06)',
        },
        '.idz-alert-header-note': {
            color: '#2f81f7',
        },
        // TIP — green
        '.idz-alert-tip': {
            borderLeftColor: '#3fb950',
            backgroundColor: 'rgba(63, 185, 80, 0.06)',
        },
        '.idz-alert-header-tip': {
            color: '#3fb950',
        },
        // IMPORTANT — purple
        '.idz-alert-important': {
            borderLeftColor: '#a371f7',
            backgroundColor: 'rgba(163, 113, 247, 0.06)',
        },
        '.idz-alert-header-important': {
            color: '#a371f7',
        },
        // WARNING — yellow
        '.idz-alert-warning': {
            borderLeftColor: '#d29922',
            backgroundColor: 'rgba(210, 153, 34, 0.06)',
        },
        '.idz-alert-header-warning': {
            color: '#d29922',
        },
        // CAUTION — red
        '.idz-alert-caution': {
            borderLeftColor: '#f85149',
            backgroundColor: 'rgba(248, 81, 73, 0.06)',
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
