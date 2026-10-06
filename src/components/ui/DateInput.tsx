import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { addDaysIso, formatDate, fromIso, todayIso, toIso } from "../../lib/format";
import "./ui.css";

interface DateInputProps {
  id: string;
  /** ISO (yyyy-mm-dd) ya da boş. */
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  placeholder?: string;
  "aria-label"?: string;
}

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];
const POP_WIDTH = 300;
const POP_HEIGHT = 380; // ölçülemezse tahmini yükseklik

const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
const dayLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

/** Ayın ilk gününü içeren haftanın pazartesisinden başlayan 6 haftalık (42 gün) takvim ızgarası. */
function calendarDays(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Pazartesi = 0
  const start = toIso(new Date(year, month, 1 - offset));
  return Array.from({ length: 42 }, (_, i) => addDaysIso(start, i));
}

interface Position {
  top: number;
  left: number;
}

/** Açılır takvimi alanın altına (sığmazsa üstüne), sağ kenardan taşmayacak şekilde yerleştirir. */
function positionFor(anchor: HTMLElement, height: number): Position {
  const rect = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - POP_WIDTH - 8));
  const below = rect.bottom + 6;
  const above = rect.top - height - 6;
  const top = below + height > window.innerHeight - 8 && above >= 8 ? above : below;
  return { top, left };
}

/**
 * Tarayıcının kendi tarih kutusu yerine sitenin tasarımına uyan tarih seçici: alan "06.10.2026" gösterir, tıklayınca
 * ay takvimi açılır (ok tuşlarıyla gezilir, Enter seçer, Esc kapatır, "Bugün" kısayolu). Değer her zaman ISO'dur;
 * formlarda zorunluluk için görünmez bir metin alanı tarayıcı doğrulamasına katılır.
 */
export function DateInput({ id, value, onChange, required, placeholder = "Tarih seçin", "aria-label": ariaLabel }: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewIso, setViewIso] = useState(value || todayIso());
  const [focusIso, setFocusIso] = useState(value || todayIso());
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const view = fromIso(viewIso);
  const today = todayIso();

  function open() {
    const start = value || today;
    setViewIso(start);
    setFocusIso(start);
    setIsOpen(true);
  }

  function close(restoreFocus = true) {
    setIsOpen(false);
    if (restoreFocus) {
      anchorRef.current?.focus();
    }
  }

  function pick(iso: string) {
    onChange(iso);
    close();
  }

  useLayoutEffect(() => {
    if (isOpen && anchorRef.current) {
      setPosition(positionFor(anchorRef.current, popRef.current?.offsetHeight || POP_HEIGHT));
    }
  }, [isOpen]);

  // Dışarı tıklayınca / sayfa kayınca kapanır; odak takvimdeki güne gider.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popRef.current?.contains(target) && !anchorRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const onScroll = (event: Event) => {
      if (!popRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      popRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusIso}"]`)?.focus();
    }
  }, [isOpen, focusIso]);

  function shiftMonth(delta: number) {
    const next = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    setViewIso(toIso(next));
    setFocusIso(toIso(next));
  }

  function moveFocus(days: number) {
    const next = addDaysIso(focusIso, days);
    const nextDate = fromIso(next);
    if (nextDate.getMonth() !== view.getMonth() || nextDate.getFullYear() !== view.getFullYear()) {
      setViewIso(toIso(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)));
    }
    setFocusIso(next);
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(moves[event.key]);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      shiftMonth(event.key === "PageUp" ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  const days = calendarDays(view.getFullYear(), view.getMonth());

  return (
    <div className="ui-date">
      <button
        ref={anchorRef}
        type="button"
        id={id}
        className={`ui-date-field${value ? "" : " empty"}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => (isOpen ? close() : open())}
      >
        <span>{value ? formatDate(value) : placeholder}</span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {required && <input className="ui-date-native" tabIndex={-1} aria-hidden="true" required readOnly value={value} />}
      {isOpen &&
        createPortal(
          <div
            ref={popRef}
            className="ui-date-pop"
            role="dialog"
            aria-label="Tarih seç"
            style={{ top: position.top, left: position.left, width: POP_WIDTH }}
            onKeyDown={onGridKeyDown}
          >
            <div className="ui-date-head">
              <button type="button" className="ui-date-nav" onClick={() => shiftMonth(-1)} aria-label="Önceki ay">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <strong aria-live="polite">{monthLabel.format(view)}</strong>
              <button type="button" className="ui-date-nav" onClick={() => shiftMonth(1)} aria-label="Sonraki ay">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="ui-date-grid" role="grid" aria-label="Takvim">
              <div className="ui-date-weekdays" role="row">
                {WEEKDAYS.map((d) => (
                  <span key={d} role="columnheader">
                    {d}
                  </span>
                ))}
              </div>
              <div className="ui-date-days" role="rowgroup">
                {days.map((iso) => {
                  const date = fromIso(iso);
                  const outside = date.getMonth() !== view.getMonth();
                  const classes = ["ui-date-day"];
                  if (outside) classes.push("outside");
                  if (iso === today) classes.push("today");
                  if (iso === value) classes.push("selected");
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      data-iso={iso}
                      tabIndex={iso === focusIso ? 0 : -1}
                      className={classes.join(" ")}
                      aria-selected={iso === value}
                      aria-label={dayLabel.format(date)}
                      onClick={() => pick(iso)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ui-date-foot">
              <button type="button" className="ui-button ghost small" onClick={() => pick(today)}>
                Bugün
              </button>
              {value && <span className="ui-muted">{dayLabel.format(fromIso(value))}</span>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
