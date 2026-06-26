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
  theme: 'light'
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
