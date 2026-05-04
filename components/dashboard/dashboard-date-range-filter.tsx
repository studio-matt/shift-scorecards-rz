"use client"

import { CalendarIcon, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DashboardDateRangeFilterProps {
  startDate?: string
  endDate?: string
  onChange: (range: { startDate?: string; endDate?: string }) => void
  className?: string
}

function dateFromYmd(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  return parseISO(value)
}

function toYmd(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function DashboardDateRangeFilter({
  startDate,
  endDate,
  onChange,
  className,
}: DashboardDateRangeFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Responses completed</Label>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Responses completed from"
            className="h-10 w-32"
            placeholder="YYYY-MM-DD"
            value={startDate ?? ""}
            onChange={(event) => onChange({ startDate: event.target.value || undefined, endDate })}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Pick start date">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFromYmd(startDate)}
                onSelect={(date) => onChange({ startDate: date ? toYmd(date) : undefined, endDate })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <span className="mb-3 text-xs text-muted-foreground">to</span>

      <div className="space-y-1">
        <Label className="sr-only">Responses completed to</Label>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Responses completed to"
            className="h-10 w-32"
            placeholder="YYYY-MM-DD"
            value={endDate ?? ""}
            onChange={(event) => onChange({ startDate, endDate: event.target.value || undefined })}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Pick end date">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFromYmd(endDate)}
                onSelect={(date) => onChange({ startDate, endDate: date ? toYmd(date) : undefined })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(startDate || endDate) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-0.5 h-9 gap-1"
          onClick={() => onChange({})}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
