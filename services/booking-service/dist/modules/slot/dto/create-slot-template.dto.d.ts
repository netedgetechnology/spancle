export declare class RecurrenceRuleDto {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
}
export declare class CreateSlotTemplateDto {
    courtId: string;
    branchId: string;
    name: string;
    description?: string;
    validFrom: string;
    validUntil?: string;
    recurrence: RecurrenceRuleDto;
    /** HH:MM override — null uses court operating hours */
    openTime?: string;
    closeTime?: string;
    durationMins: number;
    bufferMins?: number;
    maxAdvanceDays?: number;
    maxBookings?: number;
    autoPublish?: boolean;
}
//# sourceMappingURL=create-slot-template.dto.d.ts.map