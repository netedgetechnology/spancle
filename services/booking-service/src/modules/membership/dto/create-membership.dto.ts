import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMembershipDto {
  @IsUUID()
  planId!: string;

  /**
   * FK → identity-service users.id.
   * Required for individual/family primary / corporate seat assignment.
   * Omit only for unoccupied corporate seats.
   */
  @IsUUID() @IsOptional()
  userId?: string;

  /** Overrides the plan's membershipType when staff are creating a special case. */
  @IsString() @IsOptional() @MaxLength(50)
  membershipType?: string;

  @IsBoolean() @IsOptional()
  autoRenew?: boolean;

  /**
   * FK → memberships.id of the parent membership.
   * Required for family dependants and corporate sub-seats.
   */
  @IsUUID() @IsOptional()
  parentMembershipId?: string;

  /** Corporate HR label for unoccupied seat. */
  @IsString() @IsOptional() @MaxLength(100)
  seatLabel?: string;

  @IsString() @IsOptional() @MaxLength(500)
  notes?: string;
}
