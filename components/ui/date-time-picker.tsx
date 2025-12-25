"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    disabled?: boolean
    placeholder?: string
}

export function DateTimePicker({ date, setDate, disabled, placeholder = "Pick date and time" }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
    const [timeValue, setTimeValue] = React.useState(date ? format(date, "HH:mm") : "09:00")

    React.useEffect(() => {
        if (date) {
            setSelectedDate(date)
            setTimeValue(format(date, "HH:mm"))
        }
    }, [date])

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            const [hours, minutes] = timeValue.split(":").map(Number)
            newDate.setHours(hours, minutes, 0, 0)
            setSelectedDate(newDate)
            setDate(newDate)
        } else {
            setSelectedDate(undefined)
            setDate(undefined)
        }
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value
        setTimeValue(newTime)

        if (selectedDate) {
            const [hours, minutes] = newTime.split(":").map(Number)
            const newDate = new Date(selectedDate)
            newDate.setHours(hours, minutes, 0, 0)
            setDate(newDate)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                        format(selectedDate, "PPP 'at' h:mm a")
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                <div className="p-3 border-t flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <Input
                        type="time"
                        value={timeValue}
                        onChange={handleTimeChange}
                        className="w-auto"
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
