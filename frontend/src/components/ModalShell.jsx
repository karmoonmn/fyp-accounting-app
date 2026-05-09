import React from 'react'

export default function ModalShell({ onClose, children }) {
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-200">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onMouseDown={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-start justify-center p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dialog"
          className="mt-10 w-full max-w-[1200px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}

