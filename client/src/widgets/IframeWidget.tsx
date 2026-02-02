interface IframeConfig {
  url: string
  title?: string
  refreshInterval?: number
}

export function IframeWidget({ config }: { config: IframeConfig }) {
  const key = config.refreshInterval 
    ? Math.floor(Date.now() / config.refreshInterval) 
    : 0

  return (
    <iframe
      key={key}
      src={config.url}
      title={config.title || 'Embedded Content'}
      className="w-full h-full border-0"
      allow="autoplay; fullscreen"
    />
  )
}
