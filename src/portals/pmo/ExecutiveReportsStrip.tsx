import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileBarChart,
  FileText,
  HardDrive,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/design-system/components/Button'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import {
  DEMO_AS_OF_DATE,
  REPORT_DATA_STATUS,
  REPORT_EXPORT_FORMAT,
  type ReportId,
} from '@/constants'
import { mockReportsService } from '@/mock-services'
import type { PmoDashboardReportCard, PmoDashboardReportType } from '@/mock-services/reports.service'
import type { PmoFilter } from '@/mock-services/pmoPortal.service'
import type { ReportDataStatus } from '@/constants'
import { useUiStore } from '@/state/ui'
import { cn } from '@/utils'

const CARD_GAP_PX = 16
const CARD_WIDTH_PX = 336

const REPORT_FILE_SIZE: Record<PmoDashboardReportType, string> = {
  Brief: '0.6 MB',
  Portfolio: '1.4 MB',
  Module: '0.9 MB',
}

function reportPreviewHref(reportId: string, filter: PmoFilter) {
  const params = new URLSearchParams({
    report: reportId,
    period: filter.reportingPeriodId ?? '',
  })
  if (filter.sector) params.set('sector', filter.sector)
  if (filter.province) params.set('province', filter.province)
  return `/pmo/reports?${params.toString()}`
}

function formatAsOfDate(isoDate: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00`))
}

function dataStatusTone(status: ReportDataStatus) {
  if (status === REPORT_DATA_STATUS.APPROVED) {
    return 'border-soe-success/30 bg-soe-success/10 text-soe-success'
  }
  if (status === REPORT_DATA_STATUS.PROTOTYPE_MIXED) {
    return 'border-soe-warning/30 bg-soe-warning/10 text-soe-warning'
  }
  return 'border-soe-border bg-soe-canvas text-soe-slate'
}

function reportTypeTone(type: PmoDashboardReportType) {
  if (type === 'Brief') return 'bg-soe-teal/10 text-soe-teal border-soe-teal/20'
  if (type === 'Portfolio') return 'bg-soe-blue/10 text-soe-blue border-soe-blue/20'
  return 'bg-soe-canvas text-soe-slate border-soe-border'
}

function ExecutiveReportCard({
  card,
  filter,
  onDownload,
  downloading,
}: {
  card: PmoDashboardReportCard
  filter: PmoFilter
  onDownload: (reportId: ReportId) => void
  downloading: boolean
}) {
  const previewHref = reportPreviewHref(card.reportId, filter)

  return (
    <article className="flex w-[min(100%,336px)] shrink-0 snap-start flex-col rounded-[14px] border border-soe-border/80 bg-white p-4 shadow-[0_10px_28px_rgba(18,48,74,0.08)] transition-shadow hover:shadow-[0_14px_32px_rgba(18,48,74,0.11)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-soe-blue/12 to-soe-teal/10 text-soe-blue ring-1 ring-soe-blue/10">
          <FileText size={17} strokeWidth={1.75} aria-hidden />
        </div>
        <span className="rounded-full border border-soe-blue/15 bg-soe-blue/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-soe-blue">
          PDF
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
            reportTypeTone(card.reportType),
          )}
        >
          {card.reportType}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-soe-slate">
          <Building2 size={11} aria-hidden />
          MoIP · Portfolio
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-soe-navy">
        {card.name}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-soe-slate">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={12} className="text-soe-blue/80" aria-hidden />
          {formatAsOfDate(DEMO_AS_OF_DATE)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HardDrive size={12} className="text-soe-blue/80" aria-hidden />
          {REPORT_FILE_SIZE[card.reportType]}
        </span>
      </div>

      <div className="mt-2">
        <span
          className={cn(
            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
            dataStatusTone(card.dataStatus),
          )}
        >
          {card.dataStatusLabel}
        </span>
        <span className="ml-2 text-[10px] text-soe-slate">{card.periodLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to={previewHref}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-soe-border bg-white text-xs font-medium text-soe-navy transition-colors hover:border-soe-blue/30 hover:bg-soe-canvas"
        >
          <Eye size={14} aria-hidden />
          Preview
        </Link>
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-[10px] text-xs"
          loading={downloading}
          onClick={() => onDownload(card.reportId)}
        >
          <Download size={14} aria-hidden />
          Download
        </Button>
      </div>
    </article>
  )
}

export function ExecutiveReportsStrip({
  filter,
  periodLabel,
}: {
  filter: PmoFilter
  periodLabel: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const pushToast = useUiStore((state) => state.pushToast)

  const cards = useQuery({
    queryKey: [
      'pmo-dashboard-report-cards',
      filter.reportingPeriodId,
      filter.sector,
      filter.province,
    ],
    queryFn: () =>
      mockReportsService.getPmoDashboardReportCards({
        reportingPeriodId: filter.reportingPeriodId,
        sector: filter.sector || undefined,
        province: filter.province || undefined,
      }),
  })

  const exportMut = useMutation({
    mutationFn: (reportId: ReportId) =>
      mockReportsService.exportReport(
        reportId,
        REPORT_EXPORT_FORMAT.PDF,
        'pmo',
        {
          reportingPeriodId: filter.reportingPeriodId,
          sector: filter.sector || undefined,
          province: filter.province || undefined,
        },
      ),
    onSuccess: (result) => {
      pushToast({ title: result.message, tone: 'info' })
    },
    onError: () => {
      pushToast({ title: 'Demo export failed.', tone: 'critical' })
    },
  })

  const cardStride = CARD_WIDTH_PX + CARD_GAP_PX
  const [maxIndex, setMaxIndex] = useState(0)

  const syncActiveIndex = useCallback(() => {
    const node = scrollRef.current
    if (!node || !cards.data?.length) return
    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    const maxIdx = Math.max(0, Math.round(maxScrollLeft / cardStride))
    setMaxIndex(maxIdx)

    const index = Math.round(node.scrollLeft / cardStride)
    setActiveIndex(Math.max(0, Math.min(index, maxIdx)))
  }, [cardStride, cards.data?.length])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    syncActiveIndex()
    node.addEventListener('scroll', syncActiveIndex, { passive: true })
    window.addEventListener('resize', syncActiveIndex)
    return () => {
      node.removeEventListener('scroll', syncActiveIndex)
      window.removeEventListener('resize', syncActiveIndex)
    }
  }, [syncActiveIndex, cards.data?.length])

  const scrollToIndex = (index: number) => {
    scrollRef.current?.scrollTo({ left: index * cardStride, behavior: 'smooth' })
    setActiveIndex(index)
  }

  const scrollBy = (direction: 'left' | 'right') => {
    const next = direction === 'left' ? activeIndex - 1 : activeIndex + 1
    if (!cards.data?.length) return
    scrollToIndex(Math.max(0, Math.min(next, maxIndex)))
  }

  const scopeMeta = [periodLabel, 'Cabinet & strategic briefs · read-only'].filter(Boolean).join(' · ')

  return (
    <section
      id="executive-reports"
      className="scroll-mt-24 mt-6 overflow-hidden rounded-[14px] border border-soe-border bg-gradient-to-br from-[#e8f1f7] via-white to-[#ebf6f4] p-4 shadow-[var(--shadow-sm)] md:p-5"
      aria-label="Executive Reports"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-soe-blue text-white shadow-[0_6px_16px_rgba(29,93,143,0.22)]">
          <FileBarChart size={20} strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-soe-navy">Executive Reports</h2>
          <p className="mt-0.5 text-xs text-soe-slate">{scopeMeta}</p>
        </div>
      </div>

      {cards.isLoading ? (
        <div className="mt-4">
          <LoadingBlock label="Loading executive reports…" />
        </div>
      ) : null}
      {cards.isError ? (
        <div className="mt-4">
          <ErrorState title="Unable to load executive reports" detail="Try refreshing the dashboard." />
        </div>
      ) : null}

      {cards.data?.length ? (
        <div className="mt-4">
          <div
            ref={scrollRef}
            className="scrollbar-soft flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          >
            {cards.data.map((card) => (
              <ExecutiveReportCard
                key={card.reportId}
                card={card}
                filter={filter}
                onDownload={(reportId) => exportMut.mutate(reportId)}
                downloading={exportMut.isPending && exportMut.variables === card.reportId}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Previous report"
              disabled={activeIndex === 0}
              onClick={() => scrollBy('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-soe-border bg-white text-soe-navy shadow-[var(--shadow-xs)] transition-colors hover:border-soe-blue/30 hover:bg-soe-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>

            <div className="flex items-center gap-1.5" role="tablist" aria-label="Report slides">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => scrollToIndex(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === activeIndex
                      ? 'w-6 bg-soe-blue'
                      : 'w-2 bg-soe-blue/20 hover:bg-soe-blue/35',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              aria-label="Next report"
              disabled={activeIndex >= maxIndex}
              onClick={() => scrollBy('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-soe-border bg-white text-soe-navy shadow-[var(--shadow-xs)] transition-colors hover:border-soe-blue/30 hover:bg-soe-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
