import { useState, useEffect, Suspense, lazy } from 'react'
import { templates, TemplateName } from '../templates'

interface TemplateWidgetProps {
  config: {
    template: TemplateName
    data: Record<string, any>
  }
}

// Loading placeholder
function TemplateLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-white text-xl animate-pulse">Loading...</div>
    </div>
  )
}

// Error fallback
function TemplateError({ template }: { template: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <div className="text-white text-xl">Template not found</div>
        <div className="text-gray-400 mt-2">{template}</div>
      </div>
    </div>
  )
}

export function TemplateWidget({ config }: TemplateWidgetProps) {
  const [Component, setComponent] = useState<React.ComponentType<{ data: any }> | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadTemplate = async () => {
      const loader = templates[config.template]
      if (!loader) {
        setError(true)
        return
      }
      try {
        const TemplateComponent = await loader()
        setComponent(() => TemplateComponent)
      } catch (e) {
        console.error('Failed to load template:', e)
        setError(true)
      }
    }
    loadTemplate()
  }, [config.template])

  if (error) {
    return <TemplateError template={config.template} />
  }

  if (!Component) {
    return <TemplateLoading />
  }

  return <Component data={config.data} />
}
