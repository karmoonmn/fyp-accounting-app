import React, { useState, useRef, useEffect } from 'react'
import { HiOutlineChevronDown, HiCheck } from 'react-icons/hi2'

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "", buttonClassName = "h-11", onCreateNew }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => String(o.value) === String(value))

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-[13px] font-medium transition-all duration-200 outline-none ${
          open 
            ? 'border-[#0F766E] shadow-[0_0_0_3px_rgba(15,118,110,0.1)]' 
            : 'border-[#E5E7EB] hover:border-[#9CA3AF] shadow-sm'
        } ${buttonClassName}`}
      >
        <span className={`block truncate ${selectedOption ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <HiOutlineChevronDown 
          className={`ml-2 h-4 w-4 shrink-0 text-[#6B7280] transition-transform duration-200 ease-in-out ${open ? 'rotate-180 text-[#0F766E]' : ''}`} 
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-[#E5E7EB] bg-white/95 backdrop-blur-xl p-1 shadow-[0_8px_30px_rgb(0,0,0,0.08)] outline-none animate-in fade-in zoom-in-95 duration-100">
          {options.map((option) => {
            const isSelected = String(value) === String(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className={`group relative flex w-full cursor-default select-none items-center rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${
                  isSelected
                    ? 'bg-[#0F766E]/10 text-[#0F766E] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span className="block truncate pr-6">{option.label}</span>
                {isSelected && (
                  <span className="absolute inset-y-0 right-3 flex items-center text-[#0F766E]">
                    <HiCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </button>
            )
          })}
          {options.length === 0 && (
            <div className="px-3 py-3 text-center text-[13px] text-[#9CA3AF]">
              No options available
            </div>
          )}
          {onCreateNew && (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#0F766E]/30 bg-[#F0FDF4]/50 px-3 py-2.5 mt-1 text-[13px] font-bold text-[#0F766E] transition-colors hover:bg-[#F0FDF4] hover:border-[#0F766E]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCreateNew()
                setOpen(false)
              }}
            >
              + Create new
            </button>
          )}
        </div>
      )}
    </div>
  )
}
