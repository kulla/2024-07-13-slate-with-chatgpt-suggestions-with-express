import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <h1>Hello Worjjjld</h1>
  </React.StrictMode>,
)

let buildId: string | null = null
setTimeout(checkBuildId, 2000)

async function checkBuildId() {
  const currentBuildId = await fetch('/___build_id').then((res) => res.text())

  if (buildId === null) {
    buildId = currentBuildId
  }

  if (buildId !== currentBuildId) {
    window.location.reload()
  } else {
    setTimeout(checkBuildId, 2000)
  }
}
