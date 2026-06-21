import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Copy, Check, ArrowLeft, AlertTriangle } from 'lucide-react'

export default function EmbedCode() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    supabase.from('projects').select('*').eq('id', id).single()
      .then(({ data }) => setProject(data))
  }, [id])

  const TOUR_DOMAIN = 'https://tour.solodeveloper.pro'

  const iframeCode = project
    ? `<iframe\n  src="${TOUR_DOMAIN}/embed/${project.embed_token}"\n  width="100%"\n  height="600px"\n  frameborder="0"\n  allowfullscreen\n  style="border-radius:12px;"\n></iframe>`
    : ''

  const scriptCode = project
    ? `<div id="tourpro-container"\n  data-token="${project.embed_token}"\n  style="width:100%;height:600px;">\n</div>\n<script src="${TOUR_DOMAIN}/widget.js"></script>`
    : ''

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const CodeBlock = ({ code, copyKey, label }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <span className="text-gray-400 text-xs font-semibold">{label}</span>
        <button
          onClick={() => copyToClipboard(code, copyKey)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied === copyKey ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied === copyKey ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs text-orange-355 font-mono overflow-x-auto whitespace-pre-wrap select-all">{code}</pre>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl mx-auto pb-16">
      {/* Back button */}
      <button
        onClick={() => navigate(`/projects/${id}`)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Editor
      </button>

      <h1 className="text-2xl font-bold text-white mb-2 font-display">Get Embed Code</h1>
      {project && (
        <p className="text-gray-400 text-sm mb-6">
          {project.building_name} — <span className="text-gray-300 font-medium">{project.client_name}</span>
        </p>
      )}

      {project && !project.is_live && (
        <div className="bg-yellow-950/20 border border-yellow-800/60 text-yellow-400 rounded-xl px-4 py-3 mb-6 text-xs flex items-center gap-2.5">
          <AlertTriangle size={18} className="shrink-0" />
          <span>This tour is currently set to <strong>Draft</strong>. Toggle it to <strong>Live</strong> in the project page before copying these codes, or visitors will not be able to view the tour.</span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-white text-sm font-bold mb-2">Option A — iframe (Recommended for WordPress, Wix, Squarespace)</h2>
          <CodeBlock code={iframeCode} copyKey="iframe" label="HTML / Embed" />
        </div>

        <div>
          <h2 className="text-white text-sm font-bold mb-2">Option B — Script Tag (Best Performance & SEO integration)</h2>
          <CodeBlock code={scriptCode} copyKey="script" label="HTML / Script" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-300 font-semibold mb-3 text-sm">Integration Instructions</h3>
          <ol className="text-gray-400 text-xs space-y-2 list-decimal list-inside leading-relaxed">
            <li>Copy the code above (Option A works easiest on most page builders).</li>
            <li>Log into your client's web CMS (WordPress dashboard, Wix admin, or Shopify).</li>
            <li>Edit the target page and add a **Custom HTML** or **Embed** section block.</li>
            <li>Paste the copied HTML snippet directly inside the code field and save.</li>
            <li>The interactive 360° virtual tour will display live instantly.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
