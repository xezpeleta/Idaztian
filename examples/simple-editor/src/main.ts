import './style.css'
import 'idaztian/style.css'
import { IdaztianEditor } from 'idaztian'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="app-container">
    <header class="header">
      <h1>Simple Editor</h1>
      <div class="controls">
        <label>
          Theme:
          <select id="theme-select">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
        <label>
          <input type="checkbox" id="toggle-read-only" /> Read Only
        </label>
        <button id="toggle-toolbar">Toggle Toolbar</button>
        <span id="cursor-pos" style="margin-left: auto; font-family: monospace; font-size: 13px; color: #666; padding: 4px 8px; background: #f0f0f0; border-radius: 4px;">Line 1, Col 0 (Pos 0/0)</span>
      </div>
    </header>
    
    <div id="editor-container"></div>
  </div>
`

const container = document.getElementById('editor-container')!

const editor = new IdaztianEditor({
  parent: container,
  initialContent: '# Simple Vite Example\n\nThis is a minimal example demonstrating how to embed **Idaztian** in your web app using Vite and TypeScript.\n\n- It features live-preview out of the box\n- Just import the style and the class, and initialize it.\n- You can optionally enable the toolbar or context menu.',
  toolbar: true,
  readOnly: false,
  theme: 'light',
  lineNumbers: true,
})

document.getElementById('theme-select')!.addEventListener('change', (e) => {
  const theme = (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'system'
  editor.setTheme(theme)
})

document.getElementById('toggle-read-only')!.addEventListener('change', (e) => {
  const readOnly = (e.target as HTMLInputElement).checked
  editor.setReadOnly(readOnly)
})

document.getElementById('toggle-toolbar')!.addEventListener('click', () => {
  editor.toggleToolbar()
})

// Debug: cursor position tracker
{
  const posEl = document.getElementById('cursor-pos')!
  const cmEditor = container.querySelector('.cm-editor') as HTMLElement
  if (cmEditor) {
    const updatePos = () => {
      const view = (cmEditor as any).cmView?.view
      if (!view) return
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      const col = head - line.from
      posEl.textContent = `Line ${line.number}, Col ${col} (Pos ${head}/${state.doc.length}) · ${JSON.stringify(line.text.slice(0, 40))}`
    }
    // Initial update
    setTimeout(updatePos, 500)
    // Poll every 200ms
    setInterval(updatePos, 200)
  }
}
