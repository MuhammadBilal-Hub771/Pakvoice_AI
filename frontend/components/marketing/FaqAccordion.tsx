'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

export interface FaqItem {
  question: string
  answer: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-pk-green-50/40 sm:px-6"
            >
              <span className="text-[15px] font-semibold text-gray-900">{item.question}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pk-green-50 text-pk-green-600">
                {isOpen ? <Minus size={16} /> : <Plus size={16} />}
              </span>
            </button>
            {isOpen && (
              <p className="animate-fade-up px-5 pb-6 pr-14 text-[15px] leading-relaxed text-gray-600 sm:px-6">
                {item.answer}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
