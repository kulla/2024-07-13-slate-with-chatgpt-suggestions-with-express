import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import SlateEditor from './editor'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SlateEditor />
    </QueryClientProvider>
  </React.StrictMode>,
)

let buildId: string | null = null
setTimeout(checkBuildId, 2000)

async function checkBuildId() {
  const buildIdResponse = await fetch('/___build_id')

  if (!buildIdResponse.ok) {
    // most probably the server is restarting
    setTimeout(checkBuildId, 2000)
  }

  const currentBuildId = await buildIdResponse.text()

  if (buildId === null) {
    buildId = currentBuildId
  }

  if (buildId !== currentBuildId) {
    window.location.reload()
  } else {
    setTimeout(checkBuildId, 2000)
  }
}
