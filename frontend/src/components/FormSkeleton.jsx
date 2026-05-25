import React from 'react'

export default function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Top Card Skeleton */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-[#F3F4F6]"></div>
            <div className="h-10 w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-[#F3F4F6]"></div>
            <div className="h-10 w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-[#F3F4F6]"></div>
            <div className="h-10 w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-[#F3F4F6]"></div>
            <div className="h-24 w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-[#F3F4F6]"></div>
            <div className="h-10 w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-6 py-3">
          <div className="h-4 w-40 rounded bg-[#E5E7EB]"></div>
        </div>
        <div className="p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 border-b border-[#F3F4F6] p-4 items-center">
              <div className="h-6 w-6 rounded-full bg-[#F3F4F6]"></div>
              <div className="h-10 flex-1 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
              <div className="h-10 w-24 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
              <div className="h-10 w-32 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"></div>
              <div className="h-6 w-24 rounded bg-[#F3F4F6] ml-4"></div>
            </div>
          ))}
        </div>
        <div className="bg-[#FAFAFA] px-6 py-4 flex justify-between items-center border-t border-[#E5E7EB]">
          <div className="h-10 w-32 rounded-xl bg-[#F3F4F6]"></div>
          <div className="h-6 w-48 rounded bg-[#E5E7EB]"></div>
        </div>
      </div>
    </div>
  )
}
