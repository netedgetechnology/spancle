import type { SupportTicketStats } from '@/types/admin.types';

interface SupportTicketsProps {
  data:       SupportTicketStats;
  isLoading?: boolean;
}

interface TicketRowProps {
  label:     string;
  count:     number;
  color:     string;
  bgColor:   string;
  isLoading: boolean;
}

function TicketRow({ label, count, color, bgColor, isLoading }: TicketRowProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2.5 animate-pulse">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <div className="h-3.5 w-16 rounded bg-gray-200" />
        </div>
        <div className="h-6 w-10 rounded-full bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span
        className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums min-w-[2rem]"
        style={{ backgroundColor: bgColor, color }}
      >
        {count}
      </span>
    </div>
  );
}

/**
 * SupportTickets — support queue summary widget.
 *
 * Sprint 1: All values are stubbed at zero — external helpdesk
 * (Intercom / Freshdesk / Zendesk) integration is Sprint 4.
 *
 * The widget renders the correct structure and clearly communicates
 * the pending integration state so operators are not misled.
 */
export function SupportTickets({
  data,
  isLoading = false,
}: SupportTicketsProps): React.ReactElement {
  const total = data.open + data.pending + data.resolved;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Support Tickets
        </p>
        {data.isStub && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 flex-shrink-0">
            Sprint 4
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        <TicketRow
          label="Open"
          count={data.open}
          color="#ef4444"
          bgColor="#fef2f2"
          isLoading={isLoading}
        />
        <TicketRow
          label="Pending"
          count={data.pending}
          color="#f59e0b"
          bgColor="#fffbeb"
          isLoading={isLoading}
        />
        <TicketRow
          label="Resolved"
          count={data.resolved}
          color="#10b981"
          bgColor="#ecfdf5"
          isLoading={isLoading}
        />
      </div>

      {!isLoading && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          {data.isStub ? (
            <p className="text-xs text-gray-400 text-center">
              Helpdesk integration pending — Sprint 4
            </p>
          ) : (
            <p className="text-xs text-gray-500 text-center">
              {total} total tickets
            </p>
          )}
        </div>
      )}
    </div>
  );
}
