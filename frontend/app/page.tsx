import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  Code2,
  Factory,
  FileText,
  Globe,
  GraduationCap,
  HardHat,
  Image as ImageIcon,
  Landmark,
  Languages,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Mic,
  Newspaper,
  Package,
  Share2,
  Shirt,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { LandingNav } from '@/components/marketing/LandingNav'
import { FaqAccordion, type FaqItem } from '@/components/marketing/FaqAccordion'

export const metadata: Metadata = {
  title: 'Pakvoice AI — AI Content Generator for Pakistani Businesses',
  description:
    'Speak or type one line and get ready-to-post social posts, blogs, emails and ads in Urdu, English or Roman Urdu — on the web and on WhatsApp.',
}

interface Item {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURES: Item[] = [
  {
    icon: Mic,
    title: 'Voice-First Generation',
    description: 'Record a voice note in Urdu or English — it becomes a finished post. No typing needed.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Business Bot',
    description: 'Generate content, create images and browse history straight from WhatsApp.',
  },
  {
    icon: BookOpen,
    title: 'Your Knowledge Base',
    description: 'Upload brochures, price lists and PDFs. The AI writes from your real business data.',
  },
  {
    icon: Languages,
    title: 'Urdu · English · Roman Urdu',
    description: 'Native-quality output in all three, with proper Nastaliq rendering for Urdu.',
  },
  {
    icon: ImageIcon,
    title: 'AI Image Generation',
    description: 'Matching visuals for every post, saved to your own gallery and ready to share.',
  },
  {
    icon: MapPin,
    title: 'City & Industry Aware',
    description: 'Karachi or Faisalabad, textile or IT — content tuned to your local market.',
  },
]

const CONTENT_TYPES: Item[] = [
  { icon: Share2, title: 'Social Media Posts', description: 'Captions and hashtags that fit your audience.' },
  { icon: FileText, title: 'Blog Articles', description: 'Long-form articles that bring search traffic.' },
  { icon: Package, title: 'Product Descriptions', description: 'Persuasive listings for your store.' },
  { icon: Mail, title: 'Email Marketing', description: 'Campaigns customers actually open.' },
  { icon: Newspaper, title: 'Press Releases', description: 'Announcement-ready launch copy.' },
  { icon: Globe, title: 'Website Content', description: 'Homepage and service page copy.' },
  { icon: Megaphone, title: 'Ad Copy', description: 'Short, high-converting promotion text.' },
  { icon: ImageIcon, title: 'Post Images', description: 'On-brand visuals for a complete post.' },
]

const INDUSTRIES: { icon: LucideIcon; title: string }[] = [
  { icon: Shirt, title: 'Textile' },
  { icon: Code2, title: 'IT & Software' },
  { icon: Wheat, title: 'Agriculture' },
  { icon: Stethoscope, title: 'Healthcare' },
  { icon: GraduationCap, title: 'Education' },
  { icon: ShoppingBag, title: 'Retail' },
  { icon: Factory, title: 'Manufacturing' },
  { icon: UtensilsCrossed, title: 'Food & Beverage' },
  { icon: HardHat, title: 'Construction' },
  { icon: Truck, title: 'Transportation' },
  { icon: Landmark, title: 'Banking & Finance' },
  { icon: Building2, title: 'Real Estate' },
]

const STEPS = [
  {
    title: 'Set up your business once',
    description: 'Business name, city, industry and tone — saved once, pre-filled everywhere.',
  },
  {
    title: 'Speak or type your idea',
    description: 'A voice note or one line, in Urdu, English or Roman Urdu. Optionally use your own documents.',
  },
  {
    title: 'Post it, or refine it',
    description: 'Copy the result, ask for another version, add a matching image — all saved in history.',
  },
]

const FAQS: FaqItem[] = [
  {
    question: 'What exactly is Pakvoice AI?',
    answer:
      'An AI content generator built for Pakistani businesses. Describe your business once, then speak or type a short idea — it writes social posts, blogs, product descriptions, emails, press releases, website copy and ads.',
  },
  {
    question: 'Can it really write proper Urdu?',
    answer:
      'Yes. Generate in Urdu, English or Roman Urdu. Urdu output renders in Nastaliq script, ready to copy straight into your posts.',
  },
  {
    question: 'Do I have to type, or can I just speak?',
    answer:
      'You can speak. Record a voice note in the app or send one on WhatsApp — it is transcribed automatically and used as your brief.',
  },
  {
    question: 'How does the WhatsApp bot work?',
    answer:
      'Link your number from your profile with a one-time code. Then message the bot to generate content, create images and see your history — without opening the website.',
  },
  {
    question: 'Can it use my own business information?',
    answer:
      'Yes. Upload PDFs, DOCX, TXT or MD files to your knowledge base. When enabled, the AI pulls relevant details from your documents so content matches your actual offering.',
  },
  {
    question: 'Is my business data private?',
    answer:
      'Your documents and content are tied to your account only. Knowledge base search is scoped per user — no other account can see your material.',
  },
  {
    question: 'How much does it cost?',
    answer: 'You can create an account and start generating for free. No credit card, no subscription required.',
  },
]

const WAVEFORM = [6, 12, 18, 10, 20, 14, 8, 18, 12, 16, 7, 13, 17, 9, 6]

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-green-600">{eyebrow}</p>
      <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-gray-500 sm:text-base">{subtitle}</p>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[350px]">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-pk-green-100 via-white to-pk-green-50" />
      <div className="rounded-[2.4rem] border border-gray-200/80 bg-white p-2 shadow-[0_32px_64px_-24px_rgba(12,77,47,0.35)]">
        <div className="overflow-hidden rounded-[1.9rem]">
          {/* Chat header */}
          <div className="flex items-center gap-3 bg-pk-green-900 px-4 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
              <CrescentStarLogo size={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Pakvoice AI</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-pk-green-300" />
                online
              </p>
            </div>
            <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90">
              WhatsApp
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-2.5 bg-[#f2f7f3] px-3 py-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-pk-green-100 px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-pk-green-800">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pk-green-600 text-white">
                    <Mic size={13} />
                  </span>
                  <span className="flex items-end gap-[2.5px]" aria-hidden>
                    {WAVEFORM.map((h, i) => (
                      <span key={i} style={{ height: `${h}px` }} className="w-[3px] rounded-full bg-pk-green-600/60" />
                    ))}
                  </span>
                  <span className="text-[10px] font-medium text-pk-green-800/70">0:07</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-snug text-gray-800">
                  Lahore ki textile shop ke liye Eid sale ka post banao
                </p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                  6:02 PM <CheckCheck size={13} className="text-sky-500" />
                </p>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
                <p className="text-[12.5px] font-semibold text-pk-green-700">Eid Sale — Social Media Post</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-700">
                  Eid ki khushiyan, naye designs ke saath! Lawn aur khaddar collection par 30% tak Eid
                  discount — Lahore branch aur online. Aaj order karein, Eid se pehle delivery.
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-pk-green-600">#EidSale #LahoreFashion</p>
                <p className="mt-1 text-right text-[10px] text-gray-400">6:02 PM</p>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                <ImageIcon size={14} className="text-pk-green-600" />
                <span className="text-[12px] text-gray-600">Matching image generated</span>
                <Sparkles size={13} className="text-pk-gold" />
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-2.5">
            <span className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-[12px] text-gray-400">Message</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pk-green-600 text-white">
              <Mic size={15} />
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -left-8 top-16 hidden items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pk-green-50 text-pk-green-600">
          <Languages size={14} />
        </span>
        <span className="text-[11px] font-semibold text-gray-700">
          Urdu · English
          <br />
          Roman Urdu
        </span>
      </div>
      <div className="absolute -bottom-4 -right-2 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 shadow-lg sm:-right-8">
        <Sparkles size={14} className="text-pk-green-600" />
        <span className="text-[11px] font-semibold text-gray-700">Generated in seconds</span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div data-theme="green" className="min-h-screen bg-white">
      <LandingNav />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_-10%,#f0fdf4_0%,transparent_70%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-20">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-pk-green-200 bg-white px-4 py-1.5 text-[13px] font-medium text-pk-green-800 shadow-sm">
              <Sparkles size={14} className="text-pk-green-600" />
              AI content for Pakistani businesses
            </span>

            <h1 className="mt-7 text-[2.5rem] font-bold leading-[1.06] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.5rem]">
              Marketing content that{' '}
              <span className="bg-gradient-to-r from-pk-green-600 to-pk-green-800 bg-clip-text text-transparent">
                speaks your language
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg lg:mx-0">
              Send a voice note or type one line — get ready-to-post captions, blogs, emails and ads
              in Urdu, English or Roman Urdu. On the web, and on WhatsApp.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/register"
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-pk-green-600 px-8 text-[15px] font-semibold text-white shadow-lg shadow-pk-green-600/25 transition-all hover:-translate-y-0.5 hover:bg-pk-green-700 hover:shadow-xl hover:shadow-pk-green-600/25 sm:w-auto"
              >
                Start Free <ArrowRight size={17} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-8 text-[15px] font-semibold text-gray-700 transition-colors hover:border-pk-green-300 hover:bg-pk-green-50/50 hover:text-pk-green-800 sm:w-auto"
              >
                See how it works
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 lg:justify-start">
              {['Free to start', 'No credit card', 'Works on WhatsApp'].map((label) => (
                <span key={label} className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500">
                  <Check size={15} strokeWidth={3} className="text-pk-green-600" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <PhoneMockup />
        </div>

        {/* Stats strip */}
        <div className="border-y border-gray-100 bg-gray-50/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-gray-100 px-4 sm:px-6 lg:grid-cols-4">
            {[
              ['3', 'Languages supported'],
              ['8', 'Content formats'],
              ['12', 'Industries covered'],
              ['24/7', 'WhatsApp assistant'],
            ].map(([value, label]) => (
              <div key={label} className="px-4 py-7 text-center">
                <p className="text-2xl font-bold text-pk-green-700 sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need, nothing you have to learn"
            subtitle="Built around how Pakistani business owners actually work — on a phone, in a mix of languages, with very little spare time."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-pk-green-200 hover:shadow-[0_16px_40px_-16px_rgba(12,77,47,0.25)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pk-green-600 to-pk-green-800 text-white shadow-md shadow-pk-green-600/25">
                  <Icon size={21} />
                </span>
                <h3 className="mt-6 text-[17px] font-semibold text-gray-900">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Content types ===== */}
      <section id="content-types" className="scroll-mt-20 bg-gray-50/60 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Content"
            title="One brief, every kind of content"
            subtitle="Pick a format — the AI adapts length, structure and tone, then lets you refine until it sounds like you."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENT_TYPES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-pk-green-200"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pk-green-50 text-pk-green-600">
                    <Icon size={17} />
                  </span>
                  <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Industries ===== */}
      <section id="industries" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Industries"
            title="Tuned to your industry and your city"
            subtitle="From Faisalabad textile units to Karachi clinics — the AI knows the vocabulary, customers and selling points of your sector."
          />
          <div className="mt-14 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {INDUSTRIES.map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-pk-green-300 hover:bg-pk-green-50/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pk-green-50 text-pk-green-600">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-medium text-gray-800">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how-it-works" className="scroll-mt-20 bg-gray-50/60 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From idea to published post in three steps"
            subtitle="No prompt engineering, no complicated setup. Tell it about your business once and keep generating."
          />
          <div className="relative mt-16 grid gap-10 lg:grid-cols-3 lg:gap-8">
            <div aria-hidden className="absolute left-[16.6%] right-[16.6%] top-6 hidden border-t-2 border-dashed border-pk-green-200 lg:block" />
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative text-center">
                <span className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pk-green-600 text-lg font-bold text-white shadow-lg shadow-pk-green-600/30 ring-8 ring-gray-50">
                  {index + 1}
                </span>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you might want to know before creating your first post."
          />
          <div className="mt-12">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-pk-green-800 to-pk-green-900 px-6 py-16 text-center sm:px-12 lg:py-20">
            <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-pk-green-600/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-pk-green-300/10 blur-3xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-[2.6rem]">
                Start creating content for your business today
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">
                Create an account, add your business details and generate your first post in minutes.
                Free to start — no credit card, no subscription.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-white px-9 text-[15px] font-semibold text-pk-green-800 shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Create Free Account <ArrowRight size={17} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-[52px] items-center justify-center rounded-xl border border-white/25 px-9 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pk-green-50 ring-1 ring-pk-green-100">
                  <CrescentStarLogo size={26} />
                </span>
                <span className="text-lg font-bold tracking-tight text-gray-900">
                  Pakvoice <span className="text-pk-green-600">AI</span>
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-500">
                AI-powered content for Pakistani businesses — in Urdu, English and Roman Urdu, on the
                web and on WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Product</p>
                <ul className="mt-4 space-y-3">
                  {[
                    ['#features', 'Features'],
                    ['#content-types', 'Content types'],
                    ['#industries', 'Industries'],
                    ['#how-it-works', 'How it works'],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <a href={href} className="text-sm text-gray-500 transition-colors hover:text-pk-green-700">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Account</p>
                <ul className="mt-4 space-y-3">
                  <li>
                    <Link href="/register" className="text-sm text-gray-500 transition-colors hover:text-pk-green-700">
                      Create account
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="text-sm text-gray-500 transition-colors hover:text-pk-green-700">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <a href="#faq" className="text-sm text-gray-500 transition-colors hover:text-pk-green-700">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-sm font-semibold text-gray-900">Languages</p>
                <ul className="mt-4 space-y-3 text-sm text-gray-500">
                  <li>اردو — Urdu</li>
                  <li>English</li>
                  <li>Roman Urdu</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Pakvoice AI. Made for Pakistani businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
