import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** Body for PATCH /memberships/:id/freeze */
export class FreezeMembershipDto {
  @IsDateString()
  frozenUntil!: string; // ISO date string
}

/** Body for PATCH /memberships/:id/cancel */
export class CancelMembershipDto {
  /** When true, cancels immediately rather than at period end. */
  @IsBoolean() @IsOptional()
  immediate?: boolean;

  @IsString() @IsOptional() @MaxLength(500)
  reason?: string;
}

/** Body for PATCH /memberships/:id/upgrade */
export class UpgradeMembershipDto {
  @IsUUID()
  targetPlanId!: string;
}

/** Body for PATCH /memberships/:id/schedule-downgrade */
export class ScheduleDowngradeDto {
  @IsUUID()
  targetPlanId!: string;
}

/** Body for PATCH /memberships/:id/assign-user */
export class AssignUserDto {
  @IsUUID()
  userId!: string;

  @IsString() @IsOptional() @MaxLength(100)
  seatLabel?: string;
}

/** Body for PATCH /memberships/:id — general update (admin) */
export class UpdateMembershipDto {
  @IsBoolean() @IsOptional()
  autoRenew?: boolean;

  @IsString() @IsOptional() @MaxLength(100)
  seatLabel?: string;
}
