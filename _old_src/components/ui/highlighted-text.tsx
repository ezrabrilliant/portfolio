"use client"

interface HighlightedTextProps {
  children: React.ReactNode
  className?: string
}

export function HighlightedText({ children, className = "" }: HighlightedTextProps) {
  return (
    <span className={`bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold ${className}`}>
      {children}
    </span>
  )
}

export function parseHighlightedText(text: string) {
  // Split text by **bold** markers and apply highlighting
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2)
      return (
        <HighlightedText key={index}>
          {content}
        </HighlightedText>
      )
    }
    return part
  })
}
