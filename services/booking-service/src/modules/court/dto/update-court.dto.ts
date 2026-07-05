import { PartialType } from '@nestjs/mapped-types';
import { OmitType }    from '@nestjs/mapped-types';
import { CreateCourtDto } from './create-court.dto';

/**
 * UpdateCourtDto — all CreateCourtDto fields are optional.
 * venueId and branchId are excluded from updates; a court cannot be moved
 * between venues or branches after creation.
 */
export class UpdateCourtDto extends PartialType(
  OmitType(CreateCourtDto, ['venueId', 'branchId'] as const),
) {}
