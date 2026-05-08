import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'Event ID is required' })
  eventId!: string;

  @IsString()
  @IsNotEmpty({ message: 'User email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  userEmail!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10, { message: 'Maximum 10 tickets per booking' })
  quantity!: number;
}
